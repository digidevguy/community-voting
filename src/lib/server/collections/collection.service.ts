import type { Database, DBTransaction } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { communityCollections } from '../db/schema';
import type { CreateCommunityCollectionInput } from './collection.validation';

export async function addGameToCollection(
	db: Database | DBTransaction,
	data: CreateCommunityCollectionInput
) {
	const [newCollectionItem] = await db.insert(communityCollections).values(data).returning();

	if (!newCollectionItem) {
		throw new Error(`Unable to add game to community collection`);
	}

	return newCollectionItem;
}

export async function softRemoveGameFromCollection(
	db: Database | DBTransaction,
	communityId: string,
	userId: string,
	gameId: string
) {
	const [game] = await db
		.update(communityCollections)
		.set({
			isActive: false,
			removedBy: userId,
			removedAt: new Date()
		})
		.where(
			and(
				eq(communityCollections.communityId, communityId),
				eq(communityCollections.gameId, gameId)
			)
		);

	if (!game) {
		throw new Error('Unable to remove game from collection');
	}

	return game;
}

export async function deleteGameFromCollection(
	db: Database | DBTransaction,
	communityId: string,
	gameId: string
) {
	const [deletedGameId] = await db
		.delete(communityCollections)
		.where(
			and(
				eq(communityCollections.communityId, communityId),
				eq(communityCollections.gameId, gameId)
			)
		)
		.returning({ deletedGameId: communityCollections.gameId });

	if (!deletedGameId) {
		throw new Error('Unable to delete game from collection');
	}

	return deletedGameId;
}
