import { createVotingSession } from '$lib/server/voting/voting-session.service';
import { createVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { DBTransaction } from '$lib/server/db';
import { votingOption } from '$lib/server/db/schema';
import { confirmUserInCommunity } from '$lib/server/communities/communities.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	const { communityId } = params;

	if (!communityId) {
		return error(400, { message: 'The matching community could not be found.' });
	}

	const isUserInCommunity = await confirmUserInCommunity(locals.db, locals.user.id, communityId);
	if (!isUserInCommunity) {
		return error(403, {
			message: 'You must be a member of this community to create a voting session.'
		});
	}

	return { communityId };
};

export const actions: Actions = {
	create: async ({ params, locals, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}
		const user = locals.user;

		const { communityId } = params;

		if (!communityId) {
			return error(400, { message: 'The matching community could not be found.' });
		}

		const isUserInCommunity = await confirmUserInCommunity(locals.db, user.id, communityId);

		if (!isUserInCommunity) {
			return error(403, {
				message: 'You must be a member of this community to create a voting session.'
			});
		}

		const body = await request.json();

		const validated = createVotingSessionSchema.parse({ ...body, communityId });

		try {
			const session = await createVotingSession(locals.db, validated, user.id);

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
									addedBy: user.id,
									addedDuringVoting: false,
									approvalStatus: 'approved'
								});
							});
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

			return {
				status: 200,
				message: 'Voting session was created successfully',
				votingSessionId: session.id
			};
		} catch (err: unknown) {
			return fail(500, {
				success: false,
				message: err instanceof Error ? err.message : 'An unexpected error occurred'
			});
		}
	}
};
