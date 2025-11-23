import { createVotingSession } from '$lib/server/voting/voting-session.service';
import { createVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DBTransaction } from '$lib/server/db';
import { votingOption } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { communityId, userId } = params;

	const body = await request.json();

	console.log('Body:', body);
	const validated = createVotingSessionSchema.parse({ ...body, communityId });
	console.log(validated.gameIds);

	try {
		/**
		 * TODO: Bring in after userID refactor is in place
		 * const session = await createVotingSession(locals.db, validated, locals.user?.id);
		 */
		const session = await createVotingSession(locals.db, validated, userId);

		if (validated.gameIds && validated.gameIds.length > 0) {
			const gameIds = validated.gameIds;
			const errors: string[] = [];
			const concurrency = 4;

			async function worker() {
				while (true) {
					const gameId = gameIds.shift();
					if (!gameId) break;
					try {
						await locals.db.transaction(async (tx: DBTransaction) => {
							await tx.insert(votingOption).values({
								gameId,
								votingSessionId: session.id,
								addedBy: userId,

								addedDuringVoting: false,
								approvalStatus: 'approved'
							});
						});
						console.log(`Successfully added ${gameId}`);
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						errors.push(msg);
						console.error('Voting option error: ', msg);
					}
				}
			}

			await Promise.all(Array.from({ length: concurrency }, () => worker()));
			console.log(`Voting options save complete, Errors: ${errors.length}`);
		}

		return json({
			status: 200,
			message: 'Voting session was created successfully',
			votingSessionId: session.id
		});
	} catch (err: unknown) {
		return json({
			status: 500,
			message: err instanceof Error ? err.message : 'An unexpected error occurred'
		});
	}
};
