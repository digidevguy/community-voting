import { createUser } from '$lib/auth/user';
import * as auth from '$lib/server/auth';
import {
	confirmUserInCommunity,
	getCommunityInfo,
	getInviteById,
	redeemInvite
} from '$lib/server/communities/communities.service';
import {
	validateDisplayName,
	validateEmail,
	validatePassword,
	validateUsername
} from '$lib/validation';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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
	join: async (event) => {
		if (event.locals.user) {
			return fail(400, { message: 'You are are already logged in. Use the join button instead.' });
		}

		const { locals, request, params } = event;
		const { communityId, inviteId } = params;

		const formData = await request.formData();
		const username = formData.get('username');
		const email = formData.get('email');
		const displayName = formData.get('displayName');
		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');

		if (!validateUsername(username)) {
			return fail(400, {
				message: 'Invalid username (min 3, max 31 characters, alphanumeric only)'
			});
		}
		if (!validateEmail(email)) {
			return fail(400, { message: 'Invalid email' });
		}
		if (!validateDisplayName(displayName)) {
			return fail(400, { message: 'Invalid display name' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password (min 8, max 255 characters)' });
		}
		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match' });
		}

		const invite = await getInviteById(locals.db, inviteId);
		if (!invite || invite.communityId !== communityId) {
			return fail(404, { message: 'Invite link is incorrect. Please notify the inviter.' });
		}

		let userId = '';
		try {
			await locals.db.transaction(async (tx) => {
				userId = await createUser(tx, { username, email, displayName, password });
				await redeemInvite(tx, inviteId, userId);
			});
		} catch (error) {
			console.error('Registration error during invite join:', error);
			return fail(500, { message: 'Failed to redeem invite. Please try again.' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, userId);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return { communityId };
	},
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
		} catch (error) {
			console.error('Registration error during invite join:', error);
			return fail(500, { message: 'Failed to redeem invite. Please try again.' });
		}

		return { communityId };
	}
};
