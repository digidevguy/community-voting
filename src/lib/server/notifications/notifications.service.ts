import type { Database, DBTransaction } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { and, eq, count, desc } from 'drizzle-orm';
import * as Sentry from '@sentry/sveltekit';

type CreateNotificationInput = Omit<
	typeof notification.$inferSelect,
	'id' | 'isRead' | 'createdAt'
>;
type BulkNotificationInput = Omit<CreateNotificationInput, 'userId'>;

export async function createNotification(
	db: Database | DBTransaction,
	data: CreateNotificationInput
) {
	const [newNotification] = await db.insert(notification).values(data).returning();

	if (!newNotification) {
		throw new Error('Failed to create notification');
	}

	return newNotification;
}

export async function createNotificationForUsers(
	db: Database | DBTransaction,
	userIds: string[],
	data: BulkNotificationInput
) {
	if (userIds.length === 0) return [];

	const values = userIds.map((userId) => ({ ...data, userId }));

	try {
		const created = await db.insert(notification).values(values).returning();
		if (created.length === 0) throw new Error('Bulk notification insert returned no rows');
		return created;
	} catch (err) {
		Sentry.captureException(err, { extra: { userCount: userIds.length, type: data.type } });
		throw err;
	}
}

export async function getUnreadCount(db: Database | DBTransaction, userId: string) {
	const result = await db
		.select({
			count: count()
		})
		.from(notification)
		.where(and(eq(notification.userId, userId), eq(notification.isRead, false)));

	return result[0].count ?? 0;
}

export async function getRecentNotifications(
	db: Database | DBTransaction,
	userId: string,
	limit = 5
) {
	return await db
		.select()
		.from(notification)
		.where(eq(notification.userId, userId))
		.orderBy(desc(notification.createdAt))
		.limit(limit);
}

export async function getAllNotifications(
	db: Database | DBTransaction,
	userId: string,
	page = 1,
	limit = 20
) {
	const notifications = await db
		.select()
		.from(notification)
		.where(eq(notification.userId, userId))
		.orderBy(desc(notification.createdAt))
		.limit(limit)
		.offset((page - 1) * limit);

	const [{ total }] = await db
		.select({ total: count() })
		.from(notification)
		.where(eq(notification.userId, userId));

	return { notifications, total };
}

export async function markAsRead(
	db: Database | DBTransaction,
	notificationId: string,
	userId: string
) {
	const [updated] = await db
		.update(notification)
		.set({ isRead: true })
		.where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
		.returning();
	if (!updated) throw new Error('Notification not found or access denied');
	return updated;
}

export async function markAllAsRead(db: Database | DBTransaction, userId: string) {
	return await db
		.update(notification)
		.set({ isRead: true })
		.where(and(eq(notification.userId, userId), eq(notification.isRead, false)))
		.returning();
}
