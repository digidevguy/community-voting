import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';
import { STEAM_ID_REGEX, verifyAssertion } from '$lib/server/steam';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const params = url.searchParams;
	const claimedId = params.get('openid.claimed_id');
	const mode = params.get('openid.mode');

	if (mode !== 'id_res' || !claimedId) {
		throw error(400, 'Invalid OpenID response');
	}

	const steamIdMatch = claimedId.match(STEAM_ID_REGEX);
	if (!steamIdMatch) {
		throw error(400, 'Invalid Steam ID in OpenID response');
	}

	const isValid = await verifyAssertion(params);
	if (!isValid) {
		throw error(400, 'Steam OpenID verification failed');
	}

	const steamId = steamIdMatch[1];

	await locals.db.update(user).set({ steamId }).where(eq(user.id, locals.user.id));

	throw redirect(302, '/profile');
};
