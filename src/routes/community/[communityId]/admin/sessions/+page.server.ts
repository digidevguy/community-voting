import { user, votingSession } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import {
	closeExpiredVotingSession,
	deleteVotingSession
} from '$lib/server/voting/voting-session.service';
import { getUnresolvedCompletedSessions } from '$lib/server/voting/winner-tracking.service';
import type { Actions, PageServerLoad } from './$types';
import { getUserCommunityRole } from '$lib/server/communities/communities.service';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { community, userRole } = await parent();

	const [sessions, unresolvedWinnerSessions] = await Promise.all([
		locals.db
			.select({
				id: votingSession.id,
				title: votingSession.title,
				status: votingSession.status,
				creator: user.name,
				createdAt: votingSession.createdAt,
				endDate: votingSession.gameDayDate,
				selectedOptionId: votingSession.selectedOptionId
			})
			.from(votingSession)
			.leftJoin(user, eq(user.id, votingSession.createdBy))
			.where(eq(votingSession.communityId, community.id)),
		getUnresolvedCompletedSessions(locals.db, community.id, {
			createdAfter: new Date(env.WINNER_TRACKING_LAUNCH_DATE!)
		})
	]);

	return { sessions, unresolvedWinnerSessions, community, userRole };
};

export const actions: Actions = {
	manageSession: async ({ request, locals, params }) => {
		if (!locals.user) return redirect(302, '/auth');

		const role = await getUserCommunityRole(locals.db, locals.user.id, params.communityId);

		if (role !== 'admin' && role !== 'moderator') {
			return fail(403, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const sessionId = formData.get('sessionId');
		const action = formData.get('action');

		if (typeof sessionId !== 'string' || typeof action !== 'string') {
			return fail(400, { message: 'Invalid request' });
		}

		switch (action) {
			case 'edit':
				return redirect(303, `/voting/${sessionId}/edit`);

			case 'end_voting': {
				try {
					const result = await closeExpiredVotingSession(locals.db, sessionId);
					if (!result) return fail(400, { message: 'Session is not currently active' });
				} catch {
					return fail(500, { message: 'Failed to end voting' });
				}
				break;
			}

			case 'delete': {
				try {
					await deleteVotingSession(locals.db, sessionId);
				} catch {
					return fail(500, { message: 'Failed to delete session' });
				}
				break;
			}

			default:
				return fail(400, { message: 'Invalid action' });
		}

		return { success: true };
	}
};
