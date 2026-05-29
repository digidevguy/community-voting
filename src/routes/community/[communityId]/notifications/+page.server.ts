import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { communityUser } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { confirmUserInCommunity } from '$lib/server/communities/communities.service';

export const load: PageServerLoad = async ({ params, locals }) => {
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

	const [communityNotificationPreferences] = await locals.db
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
		);

	return {
		communityId: params.communityId,
		communityNotificationPreferences: communityNotificationPreferences ?? false
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
