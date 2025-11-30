import type {
	CreateCommunityInput,
	CreateCommunityUserInput
} from '$lib/server/communities/communites.validation';
import type { Database, DBTransaction } from '$lib/server/db';
import { community, communityUser } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

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
		throw new Error(`User not found in community with id ${communityId}`);
	}

	return userInCommunity;
}
