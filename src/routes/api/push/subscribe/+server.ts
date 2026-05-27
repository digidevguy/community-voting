import { pushSubscription } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);
	const endpoint: unknown = body?.endpoint;
	const p256dh: unknown = body?.keys?.p256dh;
	const auth: unknown = body?.keys?.auth;

	if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
		throw error(400, 'Invalid subscription payload');
	}

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
	const endpoint: unknown = body?.endpoint;

	if (typeof endpoint !== 'string') {
		throw error(400, 'Missing endpoint');
	}

	await locals.db
		.delete(pushSubscription)
		.where(
			and(eq(pushSubscription.endpoint, endpoint), eq(pushSubscription.userId, locals.user.id))
		);

	return json({ success: true });
};
