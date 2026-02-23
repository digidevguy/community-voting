import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getVotingSession,
	getUserVoteForSession,
	syncVotingSessionOptions,
	updateVotingSession,
	getVotingSessionWithResults
} from '$lib/server/voting/voting-session.service';
import { castVote } from '$lib/server/voting/voting-session.service';
import {
	createVoteSchema,
	createVotingSessionSchema
} from '$lib/server/voting/voting-session.validation';
import { getCommunityCollection } from '$lib/server/collections/collection.service';
import z from 'zod';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}
	const { votingSessionId } = params;

	if (!votingSessionId) {
		return error(500, 'Voting session not found');
	}

	return {
		session: await getVotingSessionWithResults(locals.db, votingSessionId),
		userVote: await getUserVoteForSession(locals.db, locals.user.id, votingSessionId)
	};
};

export const actions: Actions = {
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

		const existingSession = await getVotingSession(e.locals.db, routeVotingSessionId);
		if (!existingSession) {
			return fail(404, { success: false, message: 'Voting session not found.' });
		}

		if (existingSession.createdBy !== userId) {
			return fail(403, {
				success: false,
				message: 'Only the session creator can edit this voting session.'
			});
		}

		const submittedGameIds = formData
			.getAll('gameIds')
			.map((id) => id.toString())
			.filter(Boolean);
		const hasGameIdsField = formData.has('gameIds');

		const validationResult = createVotingSessionSchema.safeParse({
			title: formData.get('title')?.toString() || existingSession.title,
			description:
				formData.get('description')?.toString() ?? (existingSession.description || undefined),
			startDate:
				formData.get('startDate')?.toString() || existingSession.startDate?.toISOString() || undefined,
			votingSessionType:
				formData.get('votingSessionType')?.toString() || existingSession.voting_session_type,
			gameDayDate:
				formData.get('gameDayDate')?.toString() || existingSession.gameDayDate.toISOString(),
			showRealTimeResults: formData.has('showRealTimeResults')
				? formData.get('showRealTimeResults') === 'on'
				: existingSession.showRealTimeResults,
			allowAddingOptions: formData.has('allowAddingOptions')
				? formData.get('allowAddingOptions') === 'on'
				: existingSession.allowAddingOptions,
			communityId: existingSession.communityId,
			gameIds: hasGameIdsField ? submittedGameIds : undefined
		});

		if (!validationResult.success) {
			return fail(400, {
				success: false,
				message: validationResult.error.issues[0]?.message || 'Invalid voting session data.'
			});
		}

		const validated = validationResult.data;

		if (hasGameIdsField) {
			const collection = await getCommunityCollection(e.locals.db, existingSession.communityId);
			const collectionGameIds = new Set(collection.map((item) => item.game.id));
			const invalidGames = (validated.gameIds || []).filter((id) => !collectionGameIds.has(id));

			if (invalidGames.length > 0) {
				return fail(400, {
					success: false,
					message: `Games not in community collection: ${invalidGames.join(', ')}`
				});
			}
		}

		try {
			await e.locals.db.transaction(async (tx) => {
				const updatedSession = await updateVotingSession(tx, routeVotingSessionId, validated, userId);

				if (!updatedSession) {
					throw new Error('Voting session update failed.');
				}

				if (hasGameIdsField) {
					await syncVotingSessionOptions(
						tx,
						routeVotingSessionId,
						validated.gameIds || [],
						userId
					);
				}
			});

			return {
				success: true,
				votingSessionId: routeVotingSessionId
			};
		} catch (err: unknown) {
			console.error('Edit voting session error:', err);
			return fail(500, {
				success: false,
				message: err instanceof Error ? err.message : 'Failed to update voting session.'
			});
		}
	},
	vote: async (e) => {
		const formData = await e.request.formData();
		const votingSessionId = formData.get('votingSessionId');
		const votingOptionId = formData.get('votingOptionId');
		const userId = e.locals.user?.id;

		if (!userId) {
			throw redirect(303, '/auth');
		}

		const validated = createVoteSchema.safeParse({ userId, votingSessionId, votingOptionId });
		if (!validated.success) {
			return {
				success: false,
				errors: z.treeifyError(validated.error)
			};
		}

		try {
			const result = await castVote(
				e.locals.db,
				validated.data.userId,
				validated.data.votingSessionId,
				validated.data.votingOptionId
			);

			return {
				success: true,
				voteId: result.id
			};
		} catch (err: unknown) {
			console.error('Err: ', err);
			return {
				success: false,
				errors: [err instanceof Error ? err.message : 'Failed to cast vote']
			};
		}
	}
};
