import { createVotingSession } from '$lib/server/voting/voting-session.service';
import { createVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { DBTransaction } from '$lib/server/db';
import { game, votingOption } from '$lib/server/db/schema';
import { confirmUserInCommunity } from '$lib/server/communities/communities.service';
import { ilike } from 'drizzle-orm';
import { isGameInCollection } from '$lib/server/collections/collection.service';

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

		const body = await request.formData();

		const gameIds = body.getAll('gameIds')?.map((id) => id.toString()) || [];

		const validated = createVotingSessionSchema.parse({
			title: body.get('title')?.toString() || '',
			description: body.get('description')?.toString() || undefined,
			startDate: body.get('startDate')?.toString() || undefined,
			votingSessionType: body.get('votingSessionType')?.toString() || undefined,
			gameDayDate: body.get('gameDayDate')?.toString() || '',
			showRealTimeResults: body.get('showRealTimeResults') === 'on',
			allowAddingOptions: body.get('allowAddingOptions') === 'on',
			communityId,
			gameIds
		});

		if (validated.gameIds && validated.gameIds.length > 0) {
			const invalidGames: string[] = [];
			for (const gameId of validated.gameIds) {
				const inCollection = await isGameInCollection(locals.db, gameId, communityId);
				if (!inCollection) {
					invalidGames.push(gameId);
				}
			}

			if (invalidGames.length > 0) {
				return fail(400, {
					success: false,
					message: `The following games are not in the community collection: ${invalidGames.join(', ')}`
				});
			}
		}

		try {
			const session = await createVotingSession(locals.db, validated, user.id);

			const gameIds = validated.gameIds || [];
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
	},
	search: async ({ locals, request }) => {
		// Todo: Search for games within the community collection.
		// if (!locals.user) {
		// 	throw redirect(303, '/auth');
		// }
	}
};
