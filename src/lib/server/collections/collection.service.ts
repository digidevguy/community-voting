import type { Database, DBTransaction } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { communityCollections, game } from '$lib/server/db/schema';
import type { CreateCommunityCollectionInput } from './collection.validation';

export async function getCommunityCollection(db: Database | DBTransaction, communityId: string) {
	const collection = await db
		.select({
			id: communityCollections.id,
			addedBy: communityCollections.addedBy,
			addedAt: communityCollections.addedAt,
			isActive: communityCollections.isActive,
			removedBy: communityCollections.removedBy,
			removedAt: communityCollections.removedAt,
			game: {
				id: game.id,
				title: game.title,
				type: game.type
			}
		})
		.from(communityCollections)
		.innerJoin(game, eq(communityCollections.gameId, game.id))
		.where(eq(communityCollections.communityId, communityId));

	if (!collection || collection.length === 0) {
		throw new Error(`Unable to fetch collection community with id ${communityId}`);
	}

	return collection;
}

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

export async function ensureGameInCommunity(
	db: Database | DBTransaction,
	communityId: string,
	gameId: string,
	userId: string
) {
	const [existing] = await db
		.select()
		.from(communityCollections)
		.where(
			and(
				eq(communityCollections.communityId, communityId),
				eq(communityCollections.gameId, gameId),
				eq(communityCollections.isActive, true)
			)
		);

	if (existing) {
		return existing;
	}

	const [gameExists] = await db.select({ id: game.id }).from(game).where(eq(game.id, gameId));

	if (!gameExists) {
		throw new Error(`Game with id ${gameId} does not exist`);
	}

	const [newCollectionItem] = await db
		.insert(communityCollections)
		.values({
			communityId,
			gameId,
			addedBy: userId
		})
		.returning();

	if (newCollectionItem) {
		throw new Error('Failed to add game to community collection');
	}

	return newCollectionItem;
}
