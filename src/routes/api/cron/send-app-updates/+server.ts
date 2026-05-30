import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';
import { release, userNotificationPreference, pushSubscription } from '$lib/server/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';
import { createNotificationForUsers } from '$lib/server/notifications/notifications.service';
import { sendPushToUsers } from '$lib/server/notifications/push.service';

/** Converts a semver string like "1.2.0" to an anchor-safe slug "v1-2-0" */
function versionToSlug(version: string): string {
	return `v${version.replace(/\./g, '-')}`;
}

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

	const result = await Sentry.withMonitor('send-app-updates', async () => {
		// Find the latest release that has not yet had a notification sent
		const [pending] = await locals.db
			.select()
			.from(release)
			.where(isNull(release.notifiedAt))
			.orderBy(desc(release.publishedAt))
			.limit(1);

		if (!pending) {
			return { skipped: true, notified: 0 };
		}

		// Find all users opted in to app updates that also have a push subscription
		const rows = await locals.db
			.select({ userId: userNotificationPreference.userId })
			.from(userNotificationPreference)
			.innerJoin(pushSubscription, eq(userNotificationPreference.userId, pushSubscription.userId))
			.where(eq(userNotificationPreference.notifyAppUpdates, true));

		// Deduplicate user IDs (a user can have multiple push subscriptions)
		const userIds = [...new Set(rows.map((r) => r.userId))];

		if (userIds.length > 0) {
			const anchor = versionToSlug(pending.version);
			const url = `${env.BETTER_AUTH_URL}/docs/updates#${anchor}`;

			await createNotificationForUsers(locals.db, userIds, {
				type: 'app_update',
				title: `App update: ${pending.version}`,
				message: pending.title,
				relatedEntityType: null,
				relatedEntityId: null
			});

			await sendPushToUsers(locals.db, userIds, {
				title: `App update: ${pending.version}`,
				body: pending.title,
				url
			});
		}

		// Stamp notifiedAt regardless of user count to prevent re-triggering
		await locals.db
			.update(release)
			.set({ notifiedAt: new Date() })
			.where(eq(release.id, pending.id));

		return { skipped: false, version: pending.version, notified: userIds.length };
	});

	Sentry.logger.info('App update notifications sent', result);

	return json({ ok: true, ...result });
};
