import type {
	CreateCommunityInput,
	CreateCommunityUserInput,
	UpdateCommunityInput,
	UpdateCommunityPermissionsInput,
	UpdateInviteInput
} from '$lib/server/communities/communites.validation';
import type { Database, DBTransaction } from '$lib/server/db';
import {
	community,
	communityRole,
	communityUser,
	invitations,
	invitationRedemptions,
	user
} from '$lib/server/db/schema';
import { and, asc, count, eq, isNull, isNotNull, lt, or, sql } from 'drizzle-orm';

type CommunityRole = (typeof communityRole.enumValues)[number];

/** Returns true if the role has moderator-level or higher privileges. */
export function isPrivilegedRole(role: CommunityRole | null): boolean {
	return role === 'moderator' || role === 'admin';
}

/** Returns true when the membership is flagged as temporary (has an expiry date). */
export function isTempMember(membershipExpiresAt: Date | null | undefined): boolean {
	return membershipExpiresAt != null;
}

/**
 * Returns true when the user is allowed to create voting sessions.
 * Privileged roles always can. Regular members need the community flag to be on
 * and must not be a temporary member.
 */
export function canCreateSession(
	community: { allowMembersCreateSessions: boolean },
	role: CommunityRole | null,
	membershipExpiresAt: Date | null | undefined
): boolean {
	if (isPrivilegedRole(role)) return true;
	if (isTempMember(membershipExpiresAt)) return false;
	return community.allowMembersCreateSessions;
}

/**
 * Returns true when the user is allowed to add games to the community collection.
 * Privileged roles always can. Regular members need the community flag to be on
 * and must not be a temporary member.
 */
export function canAddToCollection(
	community: { allowMembersAddCollection: boolean },
	role: CommunityRole | null,
	membershipExpiresAt: Date | null | undefined
): boolean {
	if (isPrivilegedRole(role)) return true;
	if (isTempMember(membershipExpiresAt)) return false;
	return community.allowMembersAddCollection;
}

export async function getCommunityInfo(db: Database | DBTransaction, communityId: string) {
	const [communityInfo] = await db.select().from(community).where(eq(community.id, communityId));

	if (!communityInfo) {
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

export async function getOwnedCommunitiesCount(
	db: Database | DBTransaction,
	userId: string
): Promise<number> {
	const [result] = await db
		.select({ count: count() })
		.from(community)
		.where(eq(community.createdBy, userId));

	return result?.count ?? 0;
}

export async function createCommunity(db: Database | DBTransaction, data: CreateCommunityInput) {
	const { headerImage, ...rest } = data;
	const [newCommunity] = await db
		.insert(community)
		.values({ ...rest, ...(headerImage ? { header_image: headerImage } : {}) })
		.returning();

	if (!newCommunity) {
		throw new Error(`Failed to create community for ${data.title}`);
	}

	return newCommunity;
}

export async function updateCommunityInfo(
	db: Database | DBTransaction,
	data: UpdateCommunityInput,
	communityId: string
) {
	const { headerImage, ...rest } = data;
	const [updatedCommunity] = await db
		.update(community)
		.set({ ...rest, ...(headerImage !== undefined ? { header_image: headerImage } : {}) })
		.where(eq(community.id, communityId))
		.returning();

	if (!updatedCommunity) {
		throw new Error(`Unable to update community info.`);
	}

	return updatedCommunity;
}

export async function updateCommunityPermissions(
	db: Database | DBTransaction,
	communityId: string,
	data: UpdateCommunityPermissionsInput
) {
	const [updated] = await db
		.update(community)
		.set(data)
		.where(eq(community.id, communityId))
		.returning();

	if (!updated) {
		throw new Error(`Unable to update community permissions for ${communityId}`);
	}

	return updated;
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

export async function getUserCommunityRole(
	db: Database | DBTransaction,
	userId: string,
	communityId: string
): Promise<CommunityRole | null> {
	const [row] = await db
		.select({ role: communityUser.role })
		.from(communityUser)
		.where(and(eq(communityUser.userId, userId), eq(communityUser.communityId, communityId)));

	return row?.role ?? null;
}

/** Returns both the role and membership expiry for a user in a community, or null if not a member. */
export async function getUserCommunityMembership(
	db: Database | DBTransaction,
	userId: string,
	communityId: string
): Promise<{ role: CommunityRole; membershipExpiresAt: Date | null } | null> {
	const [row] = await db
		.select({ role: communityUser.role, membershipExpiresAt: communityUser.membershipExpiresAt })
		.from(communityUser)
		.where(and(eq(communityUser.userId, userId), eq(communityUser.communityId, communityId)));

	return row ?? null;
}

export async function createCommunityInvite(
	db: Database | DBTransaction,
	communityId: string,
	createdBy: string,
	expiresAt?: Date,
	maxUses?: number,
	label?: string,
	grantedRole?: 'member' | 'moderator',
	membershipDurationDays?: number
) {
	const [invite] = await db
		.insert(invitations)
		.values({
			communityId,
			createdBy,
			expiresAt,
			maxUses,
			label,
			grantedRole,
			membershipDurationDays
		})
		.returning();

	if (!invite) throw new Error('Failed to create community invite');

	return invite;
}

export async function getInviteById(db: Database | DBTransaction, inviteId: string) {
	const [invite] = await db.select().from(invitations).where(eq(invitations.id, inviteId));
	return invite ?? null;
}

export async function redeemInvite(db: Database | DBTransaction, inviteId: string, userId: string) {
	// Atomically increment useCount only if the invite is still valid.
	// The conditional WHERE prevents a race condition where two simultaneous
	// redemptions could both pass a read-then-check approach.
	const [invite] = await db
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

	if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
		await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, inviteId));
	}

	const membershipExpiresAt =
		invite.membershipDurationDays != null
			? new Date(Date.now() + invite.membershipDurationDays * 24 * 60 * 60 * 1000)
			: undefined;

	await joinCommunity(db, {
		communityId: invite.communityId,
		userId,
		role: invite.grantedRole ?? undefined,
		membershipExpiresAt
	});
	await db.insert(invitationRedemptions).values({ invitationId: inviteId, userId });

	return invite;
}

export async function getInvitesByCommunity(db: Database | DBTransaction, communityId: string) {
	return await db
		.select({
			id: invitations.id,
			communityId: invitations.communityId,
			createdAt: invitations.createdAt,
			createdBy: user.name,
			status: invitations.status,
			expiresAt: invitations.expiresAt,
			maxUses: invitations.maxUses,
			useCount: invitations.useCount,
			label: invitations.label,
			grantedRole: invitations.grantedRole,
			membershipDurationDays: invitations.membershipDurationDays
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

export async function updateCommunityUserRole(
	db: Database | DBTransaction,
	communityId: string,
	targetUserId: string,
	role: CommunityRole
) {
	const [updated] = await db
		.update(communityUser)
		.set({ role, membershipExpiresAt: null })
		.where(and(eq(communityUser.communityId, communityId), eq(communityUser.userId, targetUserId)))
		.returning();

	if (!updated) throw new Error(`Failed to update role for user ${targetUserId}`);

	return updated;
}

export async function cleanupExpiredInvites(db: Database | DBTransaction) {
	return await db.delete(invitations).where(sql`${invitations.expiresAt} < NOW()`);
}

export async function updateInvite(db: Database | DBTransaction, data: UpdateInviteInput) {
	const { inviteId, ...patch } = data;
	const [updated] = await db
		.update(invitations)
		.set(patch)
		.where(eq(invitations.id, inviteId))
		.returning();

	if (!updated) throw new Error(`Failed to update invite ${inviteId}`);

	return updated;
}

export async function purgeExpiredMembers(db: Database | DBTransaction) {
	return await db
		.delete(communityUser)
		.where(
			and(
				isNotNull(communityUser.membershipExpiresAt),
				lt(communityUser.membershipExpiresAt, new Date())
			)
		)
		.returning({ communityId: communityUser.communityId, userId: communityUser.userId });
}

export async function clearInactiveInvites(db: Database | DBTransaction, communityId: string) {
	return await db
		.delete(invitations)
		.where(
			and(
				eq(invitations.communityId, communityId),
				or(
					eq(invitations.status, 'expired'),
					eq(invitations.status, 'revoked'),
					eq(invitations.status, 'accepted'),
					and(eq(invitations.status, 'pending'), sql`${invitations.expiresAt} < NOW()`)
				)
			)
		)
		.returning({ id: invitations.id });
}
