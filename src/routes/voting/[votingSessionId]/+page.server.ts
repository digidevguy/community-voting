import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import {
	castVote,
	clearVoteForSession,
	closeExpiredVotingSession,
	endVotingSession,
	getUserVoteForSession,
	getVotingSessionParticipants,
	getVotingSessionWithResults
} from '$lib/server/voting/voting-session.service';
import { createVoteSchema } from '$lib/server/voting/voting-session.validation';
import { requireSessionWriteAccess, requireVotingAccess } from '$lib/server/authz/community';
import { getUserCommunityRole } from '$lib/server/communities/communities.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { votingSessionId } = params;

	if (!votingSessionId) {
		return error(500, 'Voting session not found');
	}

	await requireVotingAccess(locals, votingSessionId);

	const sessionData = await getVotingSessionWithResults(locals.db, votingSessionId);

	// Auto-transition active sessions whose game day has passed to voting_ended
	if (
		sessionData.votingSessionDetails.status === 'active' &&
		sessionData.votingSessionDetails.gameDayDate &&
		sessionData.votingSessionDetails.gameDayDate <= new Date()
	) {
		await closeExpiredVotingSession(locals.db, votingSessionId);
		// Re-fetch so the UI gets the updated status
		const refreshedSession = await getVotingSessionWithResults(locals.db, votingSessionId);
		return {
			session: refreshedSession,
			userVote: await getUserVoteForSession(locals.db, locals.user!.id, votingSessionId),
			participants: await getVotingSessionParticipants(locals.db, votingSessionId),
			userRole: await getUserCommunityRole(
				locals.db,
				locals.user!.id,
				refreshedSession.votingSessionDetails.communityId
			)
		};
	}

	return {
		session: sessionData,
		userVote: await getUserVoteForSession(locals.db, locals.user!.id, votingSessionId),
		participants: await getVotingSessionParticipants(locals.db, votingSessionId),
		userRole: await getUserCommunityRole(
			locals.db,
			locals.user!.id,
			sessionData.votingSessionDetails.communityId
		)
	};
};

export const actions: Actions = {
	vote: async ({ request, locals }) => {
		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');
		const votingOptionId = formData.get('votingOptionId');
		const userId = locals.user?.id;

		if (!votingSessionId || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Invalid voting session ID' });
		}

		await requireVotingAccess(locals, votingSessionId);

		const validated = createVoteSchema.safeParse({ userId, votingSessionId, votingOptionId });
		if (!validated.success) {
			return fail(400, {
				message: validated.error.issues[0]?.message || 'Invalid vote data.'
			});
		}

		// Check the session is still open for voting
		const sessionData = await getVotingSessionWithResults(
			locals.db,
			validated.data.votingSessionId
		);
		if (sessionData.votingSessionDetails.status !== 'active') {
			return fail(400, { message: 'Voting for this session has ended' });
		}

		try {
			const result = await castVote(
				locals.db,
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
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to cast vote'
			});
		}
	},
	clearVote: async ({ request, locals }) => {
		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');

		if (!votingSessionId || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Invalid voting session ID' });
		}

		await requireVotingAccess(locals, votingSessionId);

		// Verify session is still active before allowing vote removal
		const sessionData = await getVotingSessionWithResults(locals.db, votingSessionId);
		if (sessionData.votingSessionDetails.status !== 'active') {
			return fail(400, { message: 'Voting for this session has ended' });
		}

		try {
			await clearVoteForSession(locals.db, locals.user!.id, votingSessionId);
			return { success: true };
		} catch (e) {
			console.error('Failed to clear user vote: ', e);
			return fail(500, { message: 'Failed to clear vote. Please try again.' });
		}
	},
	endSession: async ({ locals, params }) => {
		const { votingSessionId } = params;

		const session = await requireSessionWriteAccess(locals, votingSessionId);

		try {
			await endVotingSession(locals.db, session.id, locals.user!.id);
			return { success: true };
		} catch (err: unknown) {
			console.error('Failed to end voting session: ', err);
			return fail(400, {
				message: err instanceof Error ? err.message : 'Failed to end voting session'
			});
		}
	}
};
