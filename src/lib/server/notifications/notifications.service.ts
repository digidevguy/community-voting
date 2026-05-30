import type { Database, DBTransaction } from '$lib/server/db';
import { notification, votingSession } from '$lib/server/db/schema';
import { and, eq, count, desc, sql } from 'drizzle-orm';
import * as Sentry from '@sentry/sveltekit';

type CreateNotificationInput = Omit<
	typeof notification.$inferInsert,
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
	limit = 20,
	isRead?: boolean
) {
	const notifications = await db
		.select()
		.from(notification)
		.where(
			and(
				eq(notification.userId, userId),
				isRead !== undefined ? eq(notification.isRead, isRead) : undefined
			)
		)
		.orderBy(desc(notification.createdAt))
		.limit(limit)
		.offset((page - 1) * limit);

	const [{ total }] = await db
		.select({ total: count() })
		.from(notification)
		.where(
			and(
				eq(notification.userId, userId),
				isRead !== undefined ? eq(notification.isRead, isRead) : undefined
			)
		);

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

export async function getCommunityUnreadCount(
	db: Database | DBTransaction,
	userId: string,
	communityId: string
) {
	const result = await db
		.select({ count: count() })
		.from(notification)
		.innerJoin(
			votingSession,
			and(
				sql`${notification.relatedEntityId}::uuid = ${votingSession.id}`,
				eq(notification.relatedEntityType, 'voting_session')
			)
		)
		.where(
			and(
				eq(notification.userId, userId),
				eq(notification.isRead, false),
				eq(votingSession.communityId, communityId)
			)
		);

	return result[0]?.count ?? 0;
}

export async function getCommunityNotifications(
	db: Database | DBTransaction,
	userId: string,
	communityId: string,
	page = 1,
	limit = 20,
	isRead?: boolean
) {
	const filters = and(
		eq(notification.userId, userId),
		eq(notification.relatedEntityType, 'voting_session'),
		eq(votingSession.communityId, communityId),
		isRead !== undefined ? eq(notification.isRead, isRead) : undefined
	);

	const sessionJoin = and(
		sql`${notification.relatedEntityId}::uuid = ${votingSession.id}`,
		eq(notification.relatedEntityType, 'voting_session')
	);

	const notifications = await db
		.select({
			id: notification.id,
			userId: notification.userId,
			type: notification.type,
			title: notification.title,
			message: notification.message,
			relatedEntityType: notification.relatedEntityType,
			relatedEntityId: notification.relatedEntityId,
			isRead: notification.isRead,
			createdAt: notification.createdAt
		})
		.from(notification)
		.innerJoin(votingSession, sessionJoin)
		.where(filters)
		.orderBy(desc(notification.createdAt))
		.limit(limit)
		.offset((page - 1) * limit);

	const [{ total }] = await db
		.select({ total: count() })
		.from(notification)
		.innerJoin(votingSession, sessionJoin)
		.where(filters);

	return { notifications, total };
}
