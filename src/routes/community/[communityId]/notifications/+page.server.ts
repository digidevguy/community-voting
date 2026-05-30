import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { communityUser } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { confirmUserInCommunity } from '$lib/server/communities/communities.service';
import { getCommunityNotifications } from '$lib/server/notifications/notifications.service';

const LIMIT = 20;

function getPage(url: URL): number {
	const parsed = parseInt(url.searchParams.get('page') ?? '1', 10);
	return Math.max(1, isNaN(parsed) ? 1 : parsed);
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
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

	const filterParam = url.searchParams.get('filter');
	const effectiveFilter = filterParam === 'all' ? 'all' : 'unread';
	const isRead = effectiveFilter === 'unread' ? false : undefined;

	const [[communityNotificationPreferences], { notifications, total }] = await Promise.all([
		locals.db
			.select({
				notifyVoteStarted: communityUser.notifyVoteStarted,
				notifyVoteEnded: communityUser.notifyVoteEnded,
				notifyVoteReminder: communityUser.notifyVoteReminder
			})
			.from(communityUser)
			.where(
				and(
					eq(communityUser.communityId, params.communityId),
					eq(communityUser.userId, locals.user.id)
				)
			),
		getCommunityNotifications(
			locals.db,
			locals.user.id,
			params.communityId,
			getPage(url),
			LIMIT,
			isRead
		)
	]);

	return {
		communityId: params.communityId,
		communityNotificationPreferences: communityNotificationPreferences ?? false,
		notifications,
		total,
		filter: effectiveFilter,
		page: getPage(url)
	};
};

export const actions: Actions = {
	togglePreference: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(302, '/auth');
		}

		const userInCommunity = await confirmUserInCommunity(
			locals.db,
			locals.user.id,
			params.communityId
		);

		if (!userInCommunity) {
			return fail(403, { message: 'You do not have access to this community' });
		}

		const formData = await request.formData();
		const preference = formData.get('preference') as
			| 'notifyVoteStarted'
			| 'notifyVoteEnded'
			| 'notifyVoteReminder';
		const value = formData.get('value') === 'true';

		const allowed = ['notifyVoteStarted', 'notifyVoteEnded', 'notifyVoteReminder'];
		if (!allowed.includes(preference)) return fail(400, { message: 'Invalid preference' });

		await locals.db
			.update(communityUser)
			.set({ [preference]: value })
			.where(
				and(
					eq(communityUser.communityId, params.communityId),
					eq(communityUser.userId, locals.user.id)
				)
			);
	}
};
