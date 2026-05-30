import type { Actions, PageServerLoad } from './$types';
import {
	getCommunityInfo,
	confirmUserInCommunity,
	getUserCommunityRole,
	isPrivilegedRole
} from '$lib/server/communities/communities.service';
import { getCommunityCollectionCount } from '$lib/server/collections/collection.service';
import {
	getCommunitySessions,
	renewVotingSession
} from '$lib/server/voting/voting-session.service';
import { getUnresolvedCompletedSessions } from '$lib/server/voting/winner-tracking.service';
import { getCommunityUnreadCount } from '$lib/server/notifications/notifications.service';
import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const userInCommunity = await confirmUserInCommunity(
		locals.db,
		locals.user.id,
		params.communityId
	);

	if (!userInCommunity) {
		throw error(403, 'You do not have access to this community');
	}

	const userId = locals.user.id;
	const { communityId } = params;

	const launchDateStr = env.WINNER_TRACKING_LAUNCH_DATE;
	const launchDate = launchDateStr ? new Date(launchDateStr) : undefined;
	if (launchDate && isNaN(launchDate.getTime())) {
		throw new Error(`WINNER_TRACKING_LAUNCH_DATE is not a valid date: "${launchDateStr}"`);
	}

	const [
		community,
		allSessions,
		collectionCount,
		userRole,
		unresolvedWinners,
		communityUnreadCount
	] = await Promise.all([
		getCommunityInfo(locals.db, communityId),
		getCommunitySessions(locals.db, communityId, userId),
		getCommunityCollectionCount(locals.db, communityId),
		getUserCommunityRole(locals.db, userId, communityId),
		getUnresolvedCompletedSessions(locals.db, communityId, {
			createdAfter: launchDate
		}),
		getCommunityUnreadCount(locals.db, userId, communityId)
	]);

	const isPrivileged = isPrivilegedRole(userRole);
	const sessions = allSessions.filter(
		(s) => s.status !== 'draft' || s.createdBy === userId || isPrivileged
	);

	const unresolvedWinnerIds = new Set(unresolvedWinners.map((s) => s.sessionId));

	const sessionsNeedingAction = sessions
		.filter((s) => {
			const canAct = s.createdBy === userId || isPrivileged;
			if (!canAct) return false;
			const isTied = s.status === 'voting_ended' && !s.selectedOptionId;
			const missingWinners = s.status === 'completed' && unresolvedWinnerIds.has(s.id);
			return isTied || missingWinners;
		})
		.map((s) => ({
			id: s.id,
			title: s.title,
			reason:
				s.status === 'voting_ended' && !s.selectedOptionId
					? ('tie' as const)
					: ('missing_winners' as const)
		}));

	return {
		community,
		sessions,
		collectionCount,
		userRole,
		sessionsNeedingAction,
		communityUnreadCount
	};
};

export const actions: Actions = {
	renew: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const { communityId } = params;

		const inCommunity = await confirmUserInCommunity(locals.db, locals.user.id, communityId);

		if (!inCommunity) {
			return fail(403, { message: 'You are not a member of this community.' });
		}

		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');

		if (votingSessionId === null || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Missing votingSessionId' });
		}

		let newSession;
		try {
			newSession = await renewVotingSession(locals.db, votingSessionId, locals.user.id);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to renew session';
			Sentry.captureException(err, {
				tags: { communityId, userId: locals.user.id },
				extra: { votingSessionId }
			});
			return fail(400, { message });
		}

		return redirect(303, `/voting/${newSession.id}/edit`);
	}
};
