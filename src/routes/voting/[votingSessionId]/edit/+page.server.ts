import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import type { Actions, PageServerLoad } from '../$types';
import {
	addGameToCollectionWithEnrichment,
	getCommunityCollection,
	getUserLibraryCollection,
	getUserLibraryGameIds
} from '$lib/server/collections/collection.service';
import {
	getVotingSessionWithOptions,
	syncVotingSessionOptions,
	updateVotingSession,
	publishVotingSession,
	deleteVotingSession
} from '$lib/server/voting/voting-session.service';
import { updateVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { requireSessionWriteAccess } from '$lib/server/authz/community';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const { votingSessionId } = params;
	if (!votingSessionId) {
		return error(500, { message: 'Voting session not found.' });
	}

	const session = await requireSessionWriteAccess(locals, votingSessionId);

	const [sessionDetails, collection, userCollection] = await Promise.all([
		getVotingSessionWithOptions(locals.db, votingSessionId),
		getCommunityCollection(locals.db, session.communityId),
		getUserLibraryCollection(locals.db, locals.user.id)
	]);

	return {
		sessionDetails,
		collection,
		userCollection
	};
};

export const actions: Actions = {
	delete: async ({ locals, request }) => {
		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');

		if (!votingSessionId || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Invalid voting session ID' });
		}

		const session = await requireSessionWriteAccess(locals, votingSessionId);

		try {
			await deleteVotingSession(locals.db, votingSessionId);
			Sentry.logger.info('Voting session deleted', {
				userId: locals.user?.id,
				votingSessionId,
				communityId: session.communityId
			});
		} catch (err) {
			Sentry.captureException(err, {
				extra: { votingSessionId, userId: locals.user?.id }
			});
			return fail(500, { message: 'Unable to delete voting session' });
		}

		return redirect(303, `/community/${session.communityId}`);
	},
	edit: async (e) => {
		const userId = e.locals.user?.id;
		if (!userId) {
			throw redirect(303, '/auth');
		}

		const routeVotingSessionId = e.params.votingSessionId;
		if (!routeVotingSessionId) {
			return fail(400, { success: false, message: 'Voting session not found.' });
		}

		const formData = await e.request.formData();
		const submittedVotingSessionId = formData.get('votingSessionId')?.toString();

		if (submittedVotingSessionId && submittedVotingSessionId !== routeVotingSessionId) {
			return fail(400, { success: false, message: 'Mismatched voting session id.' });
		}

		let existingSession;
		try {
			existingSession = await requireSessionWriteAccess(e.locals, routeVotingSessionId);
		} catch (err) {
			if (isHttpError(err) && err.status !== 403) throw err;
			return fail(403, {
				success: false,
				message:
					'Only the session creator or a community moderator/admin can edit this voting session.'
			});
		}

		const submittedGameIds = formData
			.getAll('gameIds')
			.map((id) => id.toString())
			.filter(Boolean);
		const hasGameIdsField = formData.has('gameIds');
		// Only sync games for draft sessions — active/ended sessions cannot have their game list changed.
		// If user tries to change options for an active session, return a clear error.
		let shouldSyncGames = false;
		if (hasGameIdsField) {
			if (existingSession.status === 'draft') {
				shouldSyncGames = true;
			} else {
				// Fetch current option IDs for this session
				const { options: currentOptions } = await getVotingSessionWithOptions(
					e.locals.db,
					routeVotingSessionId
				);
				const currentGameIds = currentOptions.map((opt) => opt.gameId);
				if (
					submittedGameIds.length !== currentGameIds.length ||
					!submittedGameIds.every((id, i) => id === currentGameIds[i])
				) {
					return fail(400, {
						success: false,
						message: 'Voting options cannot be changed after the session is active.'
					});
				}
			}
		}

		const validationResult = updateVotingSessionSchema.safeParse({
			title: formData.get('title')?.toString() || existingSession.title,
			description:
				formData.get('description')?.toString() ?? (existingSession.description || undefined),

			showRealTimeResults: formData.has('showRealTimeResults')
				? formData.get('showRealTimeResults') === 'on'
				: existingSession.showRealTimeResults,
			allowAddingOptions: formData.has('allowAddingOptions')
				? formData.get('allowAddingOptions') === 'on'
				: existingSession.allowAddingOptions,
			communityId: existingSession.communityId,
			gameIds: shouldSyncGames ? submittedGameIds : undefined
		});

		if (!validationResult.success) {
			return fail(400, {
				success: false,
				message: validationResult.error.issues[0]?.message || 'Invalid voting session data.'
			});
		}

		const validated = validationResult.data;

		if (shouldSyncGames) {
			const collection = await getCommunityCollection(e.locals.db, existingSession.communityId);
			const collectionGameIds = new Set(collection.map((item) => item.game.id));
			const missingGameIds = (validated.gameIds || []).filter((id) => !collectionGameIds.has(id));

			if (missingGameIds.length > 0) {
				const userLibraryGameIds = await getUserLibraryGameIds(e.locals.db, userId, missingGameIds);
				const userLibraryGameIdSet = new Set(userLibraryGameIds);
				const invalidGames = missingGameIds.filter((id) => !userLibraryGameIdSet.has(id));

				if (invalidGames.length > 0) {
					return fail(400, {
						success: false,
						message: `You can only add games from the community collection or your synced library. Invalid games: ${invalidGames.join(', ')}`
					});
				}
			}
		}

		try {
			await e.locals.db.transaction(async (tx) => {
				if (shouldSyncGames) {
					const txCollection = await getCommunityCollection(tx, existingSession.communityId);
					const txCollectionIds = new Set(txCollection.map((i) => i.game.id));
					const missing = (validated.gameIds || []).filter((id) => !txCollectionIds.has(id));
					for (const gameId of missing) {
						try {
							await addGameToCollectionWithEnrichment(
								tx,
								existingSession.communityId,
								userId,
								gameId
							);
						} catch (err) {
							if (!(err instanceof Error) || err.message !== 'Game already exists in collection')
								throw err;
						}
					}
				}

				const updatedSession = await updateVotingSession(
					tx,
					routeVotingSessionId,
					validated,
					userId
				);

				if (!updatedSession) {
					throw new Error('Voting session update failed.');
				}

				if (shouldSyncGames) {
					await syncVotingSessionOptions(tx, routeVotingSessionId, validated.gameIds || [], userId);
				}
			});

			Sentry.logger.info('Voting session updated', {
				userId,
				votingSessionId: routeVotingSessionId,
				communityId: existingSession.communityId
			});
			return {
				success: true,
				votingSessionId: routeVotingSessionId
			};
		} catch (err: unknown) {
			Sentry.captureException(err, {
				extra: { votingSessionId: routeVotingSessionId, userId }
			});
			return fail(500, {
				success: false,
				message: err instanceof Error ? err.message : 'Failed to update voting session.'
			});
		}
	},
	publish: async ({ request, locals }) => {
		const userId = locals.user?.id;
		if (!userId) {
			throw redirect(303, '/auth');
		}

		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');

		if (!votingSessionId || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Invalid voting session ID' });
		}

		let existingSession;
		try {
			existingSession = await requireSessionWriteAccess(locals, votingSessionId);
		} catch (err) {
			if (isHttpError(err) && err.status !== 403) throw err;
			return fail(403, {
				message:
					'Only the session creator or a community moderator/admin can publish this voting session.'
			});
		}

		const submittedGameIds = Array.from(
			new Set(
				formData
					.getAll('gameIds')
					.map((id) => id.toString())
					.filter(Boolean)
			)
		);
		const hasGameIdsField = formData.has('gameIds');
		const shouldSyncGames = hasGameIdsField && existingSession.status === 'draft';

		if (shouldSyncGames) {
			const collection = await getCommunityCollection(locals.db, existingSession.communityId);
			const collectionGameIds = new Set(collection.map((item) => item.game.id));
			const missingGameIds = submittedGameIds.filter((id) => !collectionGameIds.has(id));

			if (missingGameIds.length > 0) {
				const userLibraryGameIds = await getUserLibraryGameIds(locals.db, userId, missingGameIds);
				const userLibraryGameIdSet = new Set(userLibraryGameIds);
				const invalidGames = missingGameIds.filter((id) => !userLibraryGameIdSet.has(id));

				if (invalidGames.length > 0) {
					return fail(400, {
						message: `You can only add games from the community collection or your synced library. Invalid games: ${invalidGames.join(', ')}`
					});
				}
			}
		}

		try {
			const { status } = await locals.db.transaction(async (tx) => {
				if (shouldSyncGames) {
					const txCollection = await getCommunityCollection(tx, existingSession.communityId);
					const txCollectionIds = new Set(txCollection.map((item) => item.game.id));
					const missingGameIds = submittedGameIds.filter((id) => !txCollectionIds.has(id));

					for (const gameId of missingGameIds) {
						try {
							await addGameToCollectionWithEnrichment(
								tx,
								existingSession.communityId,
								userId,
								gameId
							);
						} catch (err) {
							if (!(err instanceof Error) || err.message !== 'Game already exists in collection') {
								throw err;
							}
						}
					}

					await syncVotingSessionOptions(tx, votingSessionId, submittedGameIds, userId);
				}

				return publishVotingSession(tx, votingSessionId, userId);
			});

			if (status === 'active') {
				Sentry.logger.info('Voting session published', {
					userId,
					votingSessionId,
					communityId: existingSession.communityId
				});
				return { success: true };
			}
			return fail(500, { message: 'Session did not transition to active' });
		} catch (error) {
			Sentry.captureException(error, {
				extra: { votingSessionId, userId }
			});
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to publish session'
			});
		}
	}
};
