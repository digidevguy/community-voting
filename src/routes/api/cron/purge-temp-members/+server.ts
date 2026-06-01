import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { and, isNotNull, lt } from 'drizzle-orm';
import { communityUser } from '$lib/server/db/schema';
import * as Sentry from '@sentry/sveltekit';

/**
 * GET /api/cron/purge-temp-members
 *
 * Removes community_user rows where membership_expires_at has passed and no
 * moderator has cleared the expiry (i.e. assigned a permanent role).
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

	const removed = await Sentry.withMonitor('purge-temp-members', () =>
		locals.db
			.delete(communityUser)
			.where(
				and(
					isNotNull(communityUser.membershipExpiresAt),
					lt(communityUser.membershipExpiresAt, now)
				)
			)
			.returning({ communityId: communityUser.communityId, userId: communityUser.userId })
	);

	Sentry.logger.info('Expired temporary memberships purged', { removed: removed.length });

	return json({ ok: true, removed: removed.length });
};
