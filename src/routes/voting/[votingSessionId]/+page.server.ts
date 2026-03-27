import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	closeExpiredVotingSession,
	endVotingSession,
	getUserVoteForSession,
	getVotingSessionParticipants,
	getVotingSessionWithResults
} from '$lib/server/voting/voting-session.service';
import { castVote } from '$lib/server/voting/voting-session.service';
import { createVoteSchema } from '$lib/server/voting/voting-session.validation';
import { vote } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}
	const { votingSessionId } = params;

	if (!votingSessionId) {
		return error(500, 'Voting session not found');
	}

	const sessionData = await getVotingSessionWithResults(locals.db, votingSessionId);

	// Auto-transition active sessions whose game day has passed to voting_ended
	if (
		sessionData.votingSessionDetails.status === 'active' &&
		sessionData.votingSessionDetails.gameDayDate &&
		sessionData.votingSessionDetails.gameDayDate <= new Date()
	) {
		await closeExpiredVotingSession(locals.db, votingSessionId);
		// Re-fetch so the UI gets the updated status
		return {
			session: await getVotingSessionWithResults(locals.db, votingSessionId),
			userVote: await getUserVoteForSession(locals.db, locals.user.id, votingSessionId)
		};
	}

	return {
		session: sessionData,
		userVote: await getUserVoteForSession(locals.db, locals.user.id, votingSessionId),
		participants: await getVotingSessionParticipants(locals.db, votingSessionId)
	};
};

export const actions: Actions = {
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
			return fail(400, {
				message: validated.error.issues[0]?.message || 'Invalid vote data.'
			});
		}

		// Check the session is still open for voting
		const sessionData = await getVotingSessionWithResults(
			e.locals.db,
			validated.data.votingSessionId
		);
		if (sessionData.votingSessionDetails.status !== 'active') {
			return fail(400, { message: 'Voting for this session has ended' });
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

		if (!locals.user?.id) {
			return fail(401, { message: 'You must be logged in to clear your vote' });
		}

		// Verify session is still active before allowing vote removal
		const sessionData = await getVotingSessionWithResults(locals.db, votingSessionId);
		if (sessionData.votingSessionDetails.status !== 'active') {
			return fail(400, { message: 'Voting for this session has ended' });
		}

		try {
			await locals.db
				.delete(vote)
				.where(and(eq(vote.votingSessionId, votingSessionId), eq(vote.userId, locals.user.id)));

			return { success: true };
		} catch (e) {
			console.error('Failed to clear user vote: ', e);
			return fail(500, { message: 'Failed to clear vote. Please try again.' });
		}
	},
	endSession: async ({ locals, params }) => {
		if (!locals.user?.id) {
			return fail(401, { message: 'You must be logged in' });
		}

		const { votingSessionId } = params;

		try {
			await endVotingSession(locals.db, votingSessionId, locals.user.id);
			return { success: true };
		} catch (err: unknown) {
			console.error('Failed to end voting session: ', err);
			return fail(400, {
				message: err instanceof Error ? err.message : 'Failed to end voting session'
			});
		}
	}
};
