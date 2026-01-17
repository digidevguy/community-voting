import type { Database, DBTransaction } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { communityCollections, game, type CommunityCollection } from '$lib/server/db/schema';
import type { CreateCommunityCollectionInput } from './collection.validation';
import { enrichGameData } from '../games/games.service';

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

export async function addGameToCollectionWithEnrichment(
	db: Database | DBTransaction,
	communityId: string,
	userId: string,
	gameId: string
): Promise<CommunityCollection> {
	const [existingGame] = await db.select().from(game).where(eq(game.id, gameId));

	if (!existingGame) {
		throw new Error(`Game with id ${gameId} does not exist`);
	}

	const [existingCollectionItem] = await db
		.select()
		.from(communityCollections)
		.where(
			and(
				eq(communityCollections.communityId, communityId),
				eq(communityCollections.gameId, gameId)
			)
		);

	if (existingCollectionItem) {
		throw new Error(`Game with id ${gameId} is already in community collection`);
	}

	const newCollectionItem = await addGameToCollection(db, {
		communityId,
		gameId,
		addedBy: userId,
		addedAt: new Date(),
		isActive: true
	});

	if (!newCollectionItem) {
		throw new Error(`Unable to add game to community collection`);
	}

	if (existingGame.type === 'video_game' && existingGame.steamAppId) {
		await enrichGameData('video_game', db, existingGame.steamAppId.toString());
	}

	return newCollectionItem;
}

export async function softRemoveGameFromCollection(
	db: Database | DBTransaction,
	communityId: string,
	userId: string,
	gameId: string
) {
	const [removedGame] = await db
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

	if (!removedGame) {
		throw new Error('Unable to remove game from collection');
	}

	return removedGame;
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
