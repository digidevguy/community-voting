import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { notification, votingSession } from '$lib/server/db/schema';
import * as Sentry from '@sentry/sveltekit';
import { and, eq, inArray, lt, notExists, or, sql } from 'drizzle-orm';

const RETENTION_MS = {
	vote_reminder: 1 * 24 * 60 * 60 * 1000,
	vote_started: 7 * 24 * 60 * 60 * 1000,
	vote_ended: 7 * 24 * 60 * 60 * 1000,
	new_option_added: 7 * 24 * 60 * 60 * 1000,
	app_update: 30 * 24 * 60 * 60 * 1000
} as const;

export const GET: RequestHandler = async ({ request, locals }) => {
	const cronSecret = env.CRON_SECRET;
	if (!cronSecret) throw error(500, 'CRON_SECRET is not configured');

	const authHeader = request.headers.get('Authorization');
	const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token || token !== cronSecret) throw error(401, 'Unauthorized');

	const now = Date.now();
	const thresholds = {
		oneDayAgo: new Date(now - RETENTION_MS.vote_reminder),
		sevenDaysAgo: new Date(now - RETENTION_MS.vote_started),
		thirtyDaysAgo: new Date(now - RETENTION_MS.app_update)
	};

	const result = await Sentry.withMonitor('purge-notifications', async () => {
		const [aged, orphaned] = await Promise.all([
			locals.db
				.delete(notification)
				.where(
					or(
						and(
							eq(notification.type, 'vote_reminder'),
							lt(notification.createdAt, thresholds.oneDayAgo)
						),
						and(
							inArray(notification.type, ['vote_started', 'vote_ended', 'new_option_added']),
							lt(notification.createdAt, thresholds.sevenDaysAgo)
						),
						and(
							eq(notification.type, 'app_update'),
							lt(notification.createdAt, thresholds.thirtyDaysAgo)
						)
					)
				)
				.returning({ id: notification.id }),

			locals.db
				.delete(notification)
				.where(
					and(
						eq(notification.relatedEntityType, 'voting_session'),
						notExists(
							locals.db
								.select({ id: votingSession.id })
								.from(votingSession)
								.where(sql`${votingSession.id} = ${notification.relatedEntityId}::uuid`)
						)
					)
				)
				.returning({ id: notification.id })
		]);

		return { deleted: aged.length, orphansDeleted: orphaned.length };
	});

	Sentry.logger.info('Notifications purged', result);
	return json({ ok: true, ...result });
};
