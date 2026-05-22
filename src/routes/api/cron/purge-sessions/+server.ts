import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { lt } from 'drizzle-orm';
import { session } from '$lib/server/db/schema';
import * as Sentry from '@sentry/sveltekit';

/**
 * GET /api/cron/purge-sessions
 *
 * Deletes all better-auth session records whose expiresAt timestamp has passed.
 *
 * Secured by a bearer token that must match the CRON_SECRET environment variable.
 * Intended to be called by an external scheduler (e.g. Vercel Cron, GitHub Actions).
 */
export const GET: RequestHandler = async ({ request, locals }) => {
	const cronSecret = env.CRON_SECRET;

	if (!cronSecret) {
		throw error(500, 'CRON_SECRET is not configured');
	}

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

	if (!token || token !== cronSecret) {
		throw error(401, 'Unauthorized');
	}

	const now = new Date();

	const deleted = await Sentry.withMonitor('purge-auth-sessions', () =>
		locals.db.delete(session).where(lt(session.expiresAt, now)).returning({ id: session.id })
	);

	Sentry.logger.info('Expired auth sessions purged', { deleted: deleted.length });

	return json({ ok: true, deleted: deleted.length });
};
