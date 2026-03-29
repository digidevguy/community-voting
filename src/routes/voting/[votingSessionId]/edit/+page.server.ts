import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import { getCommunityCollection } from '$lib/server/collections/collection.service';
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
	const { votingSessionId } = params;
	if (!votingSessionId) {
		return error(500, { message: 'Voting session not found.' });
	}

	const session = await requireSessionWriteAccess(locals, votingSessionId);

	return {
		sessionDetails: await getVotingSessionWithOptions(locals.db, votingSessionId),
		collection: await getCommunityCollection(locals.db, session.communityId)
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
		} catch (err) {
			console.error('Failed to delete voting session:', err);
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
		// The form always submits gameIds (hidden inputs), so we must ignore them for non-draft sessions
		// rather than rejecting the entire request.
		const shouldSyncGames = hasGameIdsField && existingSession.status === 'draft';

		const validationResult = updateVotingSessionSchema.safeParse({
			title: formData.get('title')?.toString() || existingSession.title,
			description:
				formData.get('description')?.toString() ?? (existingSession.description || undefined),
			startDate:
				formData.get('startDate')?.toString() ||
				existingSession.startDate?.toISOString() ||
				undefined,
			votingSessionType:
				formData.get('votingSessionType')?.toString() || existingSession.voting_session_type,
			gameDayDate:
				formData.get('gameDayDate')?.toString() || existingSession.gameDayDate?.toISOString() || '',
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
	publish: async ({ request, locals }) => {
		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');

		if (!votingSessionId || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Invalid voting session ID' });
		}

		await requireSessionWriteAccess(locals, votingSessionId);

		try {
			const { status } = await publishVotingSession(locals.db, votingSessionId, locals.user!.id);
			if (status === 'active') {
				return { success: true };
			}
			return fail(500, { message: 'Session did not transition to active' });
		} catch (error) {
			console.error('Error publishing session', error);
			return fail(500, {
				message: error instanceof Error ? error.message : 'Failed to publish session'
			});
		}
	}
};
