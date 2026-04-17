import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const OPENID_IDENTITY = 'http://specs.openid.net/auth/2.0/identifier_select';

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
