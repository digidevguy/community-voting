import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { finalizeExpiredSessions } from '$lib/server/voting/voting-session.service';

/**
 * POST /api/cron/finalize-sessions
 *
 * Closes all active voting sessions whose gameDayDate has passed and automatically
 * selects the winning option, transitioning them to `completed`.
 *
 * Secured by a bearer token that must match the CRON_SECRET environment variable.
 * Intended to be called by an external scheduler (e.g. Vercel Cron, GitHub Actions).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const cronSecret = env.CRON_SECRET;

	if (!cronSecret) {
		throw error(500, 'CRON_SECRET is not configured');
	}

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token || token !== cronSecret) {
		throw error(401, 'Unauthorized');
	}

	const result = await finalizeExpiredSessions(locals.db);

	return json({ ok: true, ...result });
};
