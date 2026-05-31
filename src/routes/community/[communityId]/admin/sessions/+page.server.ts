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
import { manageSessionActionSchema } from '$lib/server/communities/communites.validation';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { community, userRole } = await parent();

	const launchDateStr = env.WINNER_TRACKING_LAUNCH_DATE;
	const launchDate = launchDateStr ? new Date(launchDateStr) : undefined;
	if (launchDate && isNaN(launchDate.getTime())) {
		throw new Error(`WINNER_TRACKING_LAUNCH_DATE is not a valid date: "${launchDateStr}"`);
	}

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
			createdAfter: launchDate
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
		const parsed = manageSessionActionSchema.safeParse({
			sessionId: formData.get('sessionId'),
			action: formData.get('action')
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid request' });
		}
		const { sessionId, action } = parsed.data;

		switch (action) {
			case 'edit':
				return redirect(303, `/voting/${sessionId}/edit`);

			case 'end_voting': {
				try {
					const result = await closeExpiredVotingSession(locals.db, sessionId);
					Sentry.logger.info('Voting session ended by admin', {
						userId: locals.user.id,
						communityId: params.communityId,
						votingSessionId: sessionId
					});
					if (!result) return fail(400, { message: 'Session is not currently active' });
				} catch (err) {
					Sentry.captureException(err, {
						extra: { userId: locals.user.id, communityId: params.communityId, votingSessionId: sessionId }
					});
					return fail(500, { message: 'Failed to end voting' });
				}
				break;
			}

			case 'delete': {
				try {
					await deleteVotingSession(locals.db, sessionId);
					Sentry.logger.info('Session deleted by admin', {
						userId: locals.user.id,
						communityId: params.communityId,
						votingSessionId: sessionId
					});
				} catch (err) {
					Sentry.captureException(err, {
						extra: { userId: locals.user.id, communityId: params.communityId, votingSessionId: sessionId }
					});
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
