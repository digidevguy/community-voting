import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const STEAM_ID_REGEX = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

async function verifyAssertion(params: URLSearchParams): Promise<boolean> {
	const verifyParams = new URLSearchParams(params);
	verifyParams.set('openid.mode', 'check_authentication');

	const response = await fetch(STEAM_OPENID_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: verifyParams.toString()
	});

	if (!response.ok) return false;

	const text = await response.text();
	return text.includes('is_valid:true');
}

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

	throw redirect(302, '/');
};
