import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';
import { notification, communityUser, votingSession } from '$lib/server/db/schema';
import { eq, and, gte, lt, inArray } from 'drizzle-orm';
import { createNotificationForUsers } from '$lib/server/notifications/notifications.service';
import { sendPushToUsers } from '$lib/server/notifications/push.service';

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

	const result = await Sentry.withMonitor('send-vote-reminders', async () => {
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);
		const startOfTomorrow = new Date();
		startOfTomorrow.setHours(24, 0, 0, 0);

		const activeSessions = await locals.db
			.select({
				votingSessionId: votingSession.id,
				communityId: votingSession.communityId,
				title: votingSession.title
			})
			.from(votingSession)
			.where(
				and(
					eq(votingSession.status, 'active'),
					gte(votingSession.gameDayDate, startOfToday),
					lt(votingSession.gameDayDate, startOfTomorrow)
				)
			);

		let notified = 0;

		for (const { votingSessionId, communityId, title } of activeSessions) {
			const rows = await locals.db
				.select({ userId: communityUser.userId })
				.from(communityUser)
				.where(
					and(
						eq(communityUser.communityId, communityId),
						eq(communityUser.notifyVoteReminder, true)
					)
				);

			const userIds = rows.map((r) => r.userId);

			if (userIds.length > 0) {
				const alreadyNotified = await locals.db
					.select({ userId: notification.userId })
					.from(notification)
					.where(
						and(
							inArray(notification.userId, userIds),
							eq(notification.type, 'vote_reminder'),
							eq(notification.relatedEntityId, votingSessionId),
							gte(notification.createdAt, startOfToday)
						)
					);

				const alreadyNotifiedSet = new Set(alreadyNotified.map((r) => r.userId));
				const newUserIds = userIds.filter((id) => !alreadyNotifiedSet.has(id));

				if (newUserIds.length > 0) {
					await createNotificationForUsers(locals.db, newUserIds, {
						type: 'vote_reminder',
						title: 'Vote reminder',
						message: title,
						relatedEntityType: 'voting_session',
						relatedEntityId: votingSessionId
					});

					await sendPushToUsers(locals.db, newUserIds, {
						title: 'Vote reminder',
						body: title,
						url: `${env.BETTER_AUTH_URL}/voting/${votingSessionId}`
					});

					notified += newUserIds.length;
				}
			}
		}

		return { sessions: activeSessions.length, notified };
	});

	Sentry.logger.info('Vote reminders sent', result);

	return json({ ok: true, ...result });
};
