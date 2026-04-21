import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { STEAM_OPENID_URL, OPENID_NS, OPENID_IDENTITY } from '$lib/server/steam';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const baseUrl = env.BETTER_AUTH_URL;
	const returnTo = `${baseUrl}/api/steam/callback`;

	const params = new URLSearchParams({
		'openid.ns': OPENID_NS,
		'openid.mode': 'checkid_setup',
		'openid.return_to': returnTo,
		'openid.realm': baseUrl,
		'openid.identity': OPENID_IDENTITY,
		'openid.claimed_id': OPENID_IDENTITY
	});

	throw redirect(302, `${STEAM_OPENID_URL}?${params.toString()}`);
};
