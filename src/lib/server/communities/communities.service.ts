import type {
	CreateCommunityInput,
	CreateCommunityUserInput
} from '$lib/server/communities/communites.validation';
import type { Database, DBTransaction } from '$lib/server/db';
import {
	community,
	communityUser,
	invitations,
	invitationRedemptions,
	user
} from '$lib/server/db/schema';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';

export async function getCommunityInfo(db: Database | DBTransaction, communityId: string) {
	const [communityInfo] = await db.select().from(community).where(eq(community.id, communityId));

	if (!community) {
		throw new Error(`Could not find a community match for ${communityId}`);
	}

	return communityInfo;
}

export async function getMyCommunities(db: Database | DBTransaction, userId: string) {
	return await db
		.select()
		.from(communityUser)
		.innerJoin(community, eq(community.id, communityUser.communityId))
		.where(eq(communityUser.userId, userId));
}

export async function createCommunity(db: Database | DBTransaction, data: CreateCommunityInput) {
	const [newCommunity] = await db.insert(community).values(data).returning();

	if (!newCommunity) {
		throw new Error(`Failed to create community for ${data.title}`);
	}

	return newCommunity;
}

export async function updateCommunityInfo(
	db: Database | DBTransaction,
	data: Partial<CreateCommunityInput>,
	communityId: string
) {
	const [updatedCommunity] = await db
		.update(community)
		.set(data)
		.where(eq(community.id, communityId))
		.returning();

	if (!updatedCommunity) {
		throw new Error(`Unable to update community info.`);
	}

	return updatedCommunity;
}

export async function joinCommunity(db: Database | DBTransaction, data: CreateCommunityUserInput) {
	const [newCommunityUser] = await db.insert(communityUser).values(data).returning();

	if (!newCommunityUser) {
		throw new Error(`Failed to join community with id: ${data.communityId}`);
	}

	return newCommunityUser;
}

export async function leaveCommunity(
	db: Database | DBTransaction,
	communityId: string,
	userId: string
) {
	const [deletedCommunityId] = await db
		.delete(communityUser)
		.where(and(eq(communityUser.userId, userId), eq(communityUser.communityId, communityId)))
		.returning({ deletedCommunityId: communityUser.communityId });

	if (!deletedCommunityId) {
		throw new Error(`Unable to leave community with id ${communityId}`);
	}

	return deletedCommunityId;
}

export async function deleteCommunity(
	db: Database | DBTransaction,
	communityId: string,
	userId: string
) {
	const [deletedCommunityId] = await db
		.delete(community)
		.where(and(eq(community.createdBy, userId), eq(community.id, communityId)))
		.returning({ deletedCommunityIdea: community.id });

	if (!deletedCommunityId) {
		throw new Error(`Unable to delete community with id ${communityId}`);
	}

	return deletedCommunityId;
}

export async function confirmUserInCommunity(
	db: Database | DBTransaction,
	userId: string,
	communityId: string
) {
	const [userInCommunity] = await db
		.select()
		.from(communityUser)
		.where(and(eq(communityUser.userId, userId), eq(communityUser.communityId, communityId)));

	if (!userInCommunity) {
		return false;
	}

	return true;
}

export async function createCommunityInvite(
	db: Database | DBTransaction,
	communityId: string,
	createdBy: string,
	expiresAt?: Date,
	maxUses?: number
) {
	const [invite] = await db
		.insert(invitations)
		.values({ communityId, createdBy, expiresAt, maxUses })
		.returning();

	if (!invite) throw new Error('Failed to create community invite');

	return invite;
}

export async function getInviteById(db: Database | DBTransaction, inviteId: string) {
	const [invite] = await db.select().from(invitations).where(eq(invitations.id, inviteId));
	return invite ?? null;
}

export async function redeemInvite(db: Database, inviteId: string, userId: string) {
	return await db.transaction(async (tx) => {
		// Atomically increment useCount only if the invite is still valid.
		// The conditional WHERE prevents a race condition where two simultaneous
		// redemptions could both pass a read-then-check approach.
		const [invite] = await tx
			.update(invitations)
			.set({ useCount: sql`${invitations.useCount} + 1` })
			.where(
				and(
					eq(invitations.id, inviteId),
					eq(invitations.status, 'pending'),
					or(isNull(invitations.expiresAt), sql`${invitations.expiresAt} > NOW()`),
					or(isNull(invitations.maxUses), sql`${invitations.useCount} < ${invitations.maxUses}`)
				)
			)
			.returning();

		if (!invite) throw new Error('Invite is invalid, expired, or fully used');

		await joinCommunity(tx, { communityId: invite.communityId, userId });
		await tx.insert(invitationRedemptions).values({ invitationId: inviteId, userId });

		return invite;
	});
}

export async function getInvitesByCommunity(db: Database | DBTransaction, communityId: string) {
	return await db
		.select({
			id: invitations.id,
			communityId: invitations.communityId,
			createdAt: invitations.createdAt,
			createdBy: user.displayName,
			status: invitations.status,
			expiresAt: invitations.expiresAt,
			maxUses: invitations.maxUses,
			useCount: invitations.useCount
		})
		.from(invitations)
		.leftJoin(user, eq(user.id, invitations.createdBy))
		.where(eq(invitations.communityId, communityId))
		.orderBy(asc(invitations.createdAt));
}

export async function revokeInvite(db: Database | DBTransaction, inviteId: string) {
	const [revoked] = await db
		.update(invitations)
		.set({ status: 'revoked' })
		.where(eq(invitations.id, inviteId))
		.returning();

	if (!revoked) throw new Error(`Unable to revoke invite with id ${inviteId}`);

	return revoked;
}

export async function cleanupExpiredInvites(db: Database | DBTransaction) {
	return await db.delete(invitations).where(sql`${invitations.expiresAt} < NOW()`);
}

export async function clearInactiveInvites(db: Database | DBTransaction, communityId: string) {
	return await db
		.delete(invitations)
		.where(
			and(
				eq(invitations.communityId, communityId),
				or(eq(invitations.status, 'expired'), eq(invitations.status, 'revoked'))
			)
		)
		.returning({ id: invitations.id });
}
