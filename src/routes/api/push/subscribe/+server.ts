import { pushSubscription } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import {
	pushSubscribeSchema,
	pushUnsubscribeSchema
} from '$lib/server/notifications/notifications.validation';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);
	const parsed = pushSubscribeSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, 'Invalid subscription payload');
	}
	const {
		endpoint,
		keys: { p256dh, auth }
	} = parsed.data;

	await locals.db
		.insert(pushSubscription)
		.values({ userId: locals.user.id, endpoint, p256dhKey: p256dh, authKey: auth })
		.onConflictDoUpdate({
			target: pushSubscription.endpoint,
			set: { p256dhKey: p256dh, authKey: auth }
		});

	return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);
	const parsed = pushUnsubscribeSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, 'Missing endpoint');
	}
	const { endpoint } = parsed.data;

	await locals.db
		.delete(pushSubscription)
		.where(
			and(eq(pushSubscription.endpoint, endpoint), eq(pushSubscription.userId, locals.user.id))
		);

	return json({ success: true });
};
