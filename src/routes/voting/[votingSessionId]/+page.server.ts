import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import type { ActionFailure } from '@sveltejs/kit';
import {
	assignTieBreakWinner,
	castVote,
	clearVoteForSession,
	endVotingSession,
	finalizeExpiredSessions,
	getUserVoteForSession,
	getVotingSessionParticipants,
	getVotingSessionWithResults
} from '$lib/server/voting/voting-session.service';
import { createVoteSchema } from '$lib/server/voting/voting-session.validation';
import { requireSessionWriteAccess, requireVotingAccess } from '$lib/server/authz/community';
import { getUserCommunityRole } from '$lib/server/communities/communities.service';
import type { Database } from '$lib/server/db';
import { winnerLoggingSchema } from '$lib/server/voting/voting-session.validation';
import { getSessionWinners, setSessionWinners } from '$lib/server/voting/winner-tracking.service';

function getVotingSessionId(
	formData: FormData
):
	| { error: ActionFailure<{ message: string }>; votingSessionId: null }
	| { error: null; votingSessionId: string } {
	const votingSessionId = formData.get('votingSessionId');
	if (!votingSessionId || typeof votingSessionId !== 'string') {
		return { error: fail(400, { message: 'Invalid voting session ID' }), votingSessionId: null };
	}
	return { error: null, votingSessionId };
}

async function requireOpenVotingSession(
	db: Database,
	votingSessionId: string
): Promise<
	| { error: ActionFailure<{ message: string }>; sessionData: null }
	| { error: null; sessionData: Awaited<ReturnType<typeof getVotingSessionWithResults>> }
> {
	const sessionData = await getVotingSessionWithResults(db, votingSessionId);
	const { status } = sessionData.votingSessionDetails;

	if (status !== 'active') {
		return {
			error: fail(400, { message: 'Voting for this session has ended' }),
			sessionData: null
		};
	}
	return { error: null, sessionData };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { votingSessionId } = params;

	if (!votingSessionId) {
		return error(500, 'Voting session not found');
	}

	await requireVotingAccess(locals, votingSessionId);

	// Fallback
	await finalizeExpiredSessions(locals.db);

	const sessionData = await getVotingSessionWithResults(locals.db, votingSessionId);

	return {
		session: sessionData,
		userVote: await getUserVoteForSession(locals.db, locals.user!.id, votingSessionId),
		participants: await getVotingSessionParticipants(locals.db, votingSessionId),
		winnerInfo: await getSessionWinners(locals.db, votingSessionId),
		userRole: await getUserCommunityRole(
			locals.db,
			locals.user!.id,
			sessionData.votingSessionDetails.communityId
		)
	};
};

async function parseWinnerBody(body: FormData, communityId: string, resolverId: string) {
	const userIds = body.getAll('userIds').map((id) => id.toString());

	const validationResult = winnerLoggingSchema.safeParse({
		votingSessionId: body.get('votingSessionId')?.toString(),
		votingOptionId: body.get('votingOptionId')?.toString(),
		gameId: body.get('gameId')?.toString(),
		voteCount: Number(body.get('voteCount')),
		winnerUserIds: userIds,
		winType: body.get('winType'),
		communityId,
		resolvedBy: resolverId
	});

	if (!validationResult.success) {
		const issue = validationResult.error.issues[0];
		const field = issue?.path?.join('.');
		const message = field
			? `${field}: ${issue.message}`
			: (issue?.message ?? 'Invalid winner data.');
		return {
			error: fail(400, {
				success: false,
				message
			})
		};
	}

	return { data: validationResult.data };
}

export const actions: Actions = {
	vote: async ({ request, locals }) => {
		const formData = await request.formData();
		const { error: idError, votingSessionId } = getVotingSessionId(formData);
		if (idError) return idError;

		const votingOptionId = formData.get('votingOptionId');
		const userId = locals.user?.id;

		await requireVotingAccess(locals, votingSessionId);

		const validated = createVoteSchema.safeParse({ userId, votingSessionId, votingOptionId });
		if (!validated.success) {
			return fail(400, {
				message: validated.error.issues[0]?.message || 'Invalid vote data.'
			});
		}

		const { error: sessionError } = await requireOpenVotingSession(
			locals.db,
			validated.data.votingSessionId
		);
		if (sessionError) return sessionError;

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
		const { error: idError, votingSessionId } = getVotingSessionId(formData);
		if (idError) return idError;

		await requireVotingAccess(locals, votingSessionId);

		const { error: sessionError } = await requireOpenVotingSession(locals.db, votingSessionId);
		if (sessionError) return sessionError;

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
	},
	assignTieBreak: async ({ locals, params, request }) => {
		if (!locals.user) return redirect(302, '/auth');

		const { votingSessionId } = params;
		const session = await requireSessionWriteAccess(locals, votingSessionId);

		const formData = await request.formData();
		const votingOptionId = formData.get('votingOptionId');

		if (typeof votingOptionId !== 'string') {
			return fail(400, { message: 'Invalid voting option ID' });
		}

		try {
			await assignTieBreakWinner(locals.db, session.id, votingOptionId, locals.user.id);
			return { success: true };
		} catch (err) {
			console.error('Failed to assign tie-break winner:', err);
			return fail(400, {
				message: err instanceof Error ? err.message : 'Failed to assign tie-break winner'
			});
		}
	},
	logWinners: async ({ locals, params, request }) => {
		if (!locals.user) {
			return redirect(302, '/auth');
		}

		const { votingSessionId } = params;
		const session = await requireSessionWriteAccess(locals, votingSessionId);

		if (session.status !== 'completed' && session.status !== 'voting_ended') {
			return fail(400, {
				message: 'Winner data can only be added to sessions that are completed or have ended voting'
			});
		}

		const parsed = await parseWinnerBody(
			await request.formData(),
			session.communityId,
			locals.user.id
		);
		if ('error' in parsed) return parsed.error;

		try {
			await setSessionWinners(locals.db, parsed.data);

			return { success: true };
		} catch (err) {
			console.error('Failed to add winner data:', err);
			return fail(400, {
				success: false,
				message: 'Unable to add winner data, please try again'
			});
		}
	}
};
