import { notification } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { notificationReadSchema } from '$lib/server/notifications/notifications.validation';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);

	let id: string | undefined;

	if (body !== null) {
		const parsed = notificationReadSchema.safeParse(body);
		if (!parsed.success) {
			throw error(400, 'Invalid request body');
		}
		id = parsed.data.id;
	}

	let updatedCount: number;

	if (typeof id === 'string') {
		// Mark a single notification as read, scoped to the authenticated user
		const result = await locals.db
			.update(notification)
			.set({ isRead: true })
			.where(and(eq(notification.id, id), eq(notification.userId, locals.user.id)))
			.returning({ id: notification.id });

		updatedCount = result.length;
	} else {
		// Mark all unread notifications as read for the authenticated user
		const result = await locals.db
			.update(notification)
			.set({ isRead: true })
			.where(and(eq(notification.userId, locals.user.id), eq(notification.isRead, false)))
			.returning({ id: notification.id });

		updatedCount = result.length;
	}

	return json({ count: updatedCount });
};
