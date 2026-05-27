import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL_ADDRESS } from '$env/static/private';
import { pushSubscription } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { Database, DBTransaction } from '../db';
import * as Sentry from '@sentry/sveltekit';

webpush.setVapidDetails(`mailto:${VAPID_EMAIL_ADDRESS}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type PushPayload = { title: string; body: string; url: string };
type PushSubscriptionRow = typeof pushSubscription.$inferSelect;

async function dispatchPushNotification(
	db: Database | DBTransaction,
	sub: PushSubscriptionRow,
	payload: PushPayload
) {
	try {
		await webpush.sendNotification(
			{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
			JSON.stringify(payload)
		);
	} catch (err: unknown) {
		const statusCode = (err as { statusCode?: number }).statusCode;
		if (statusCode === 410 || statusCode === 404) {
			// Subscription has been revoked by the browser — remove it
			await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, sub.endpoint));
		} else {
			// Error captured by Sentry; allSettled prevents propagation
			Sentry.captureException(err);
		}
	}
}

export async function sendPushToUser(
	db: Database | DBTransaction,
	userId: string,
	payload: PushPayload
) {
	const subscriptions = await db
		.select()
		.from(pushSubscription)
		.where(eq(pushSubscription.userId, userId));

	if (!subscriptions.length) return;

	await Promise.allSettled(subscriptions.map((sub) => dispatchPushNotification(db, sub, payload)));
}

export async function sendPushToUsers(
	db: Database | DBTransaction,
	userIds: string[],
	payload: PushPayload
) {
	if (!userIds.length) return;

	const subscriptions = await db
		.select()
		.from(pushSubscription)
		.where(inArray(pushSubscription.userId, userIds));

	if (!subscriptions.length) return;

	await Promise.allSettled(subscriptions.map((sub) => dispatchPushNotification(db, sub, payload)));
}
