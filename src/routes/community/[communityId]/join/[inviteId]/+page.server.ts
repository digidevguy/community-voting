import {
	confirmUserInCommunity,
	getCommunityInfo,
	getInviteById,
	redeemInvite
} from '$lib/server/communities/communities.service';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import * as Sentry from '@sentry/sveltekit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { communityId, inviteId } = params;

	const invite = await getInviteById(locals.db, inviteId);
	if (!invite || invite.communityId !== communityId) {
		throw error(404, 'Invite not found');
	}

	if (locals.user) {
		const inCommunity = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
		if (inCommunity) {
			return redirect(302, '/community');
		}
	}

	return {
		community: await getCommunityInfo(locals.db, communityId),
		invite,
		isAuthenticated: !!locals.user
	};
};

export const actions: Actions = {
	joinExisting: async (event) => {
		const { locals, params } = event;
		const { communityId, inviteId } = params;

		if (!locals.user) {
			return redirect(303, '/auth');
		}

		const invite = await getInviteById(locals.db, inviteId);
		if (!invite || invite.communityId !== communityId) {
			return fail(404, { message: 'Invite link is incorrect. Please notify the inviter.' });
		}

		try {
			await redeemInvite(locals.db, inviteId, locals.user.id);
		} catch (err) {
			Sentry.captureException(err, {
				tags: { communityId, userId: locals.user.id },
				extra: { inviteId }
			});
			return fail(500, { message: 'Failed to redeem invite. Please try again.' });
		}

		return { communityId };
	}
};
