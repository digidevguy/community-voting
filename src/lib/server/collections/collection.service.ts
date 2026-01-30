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
				type: game.type,
				image: game.image
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

async function addGameToCollection(
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
		throw new Error(`Game not found:id ${gameId}`);
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
		throw new Error(`Game already exits in collection: ${gameId}`);
	}

	const newCollectionItem = await addGameToCollection(db, {
		communityId,
		gameId,
		addedBy: userId,
		addedAt: new Date(),
		isActive: true
	});

	if (
		existingGame.type === 'video_game' &&
		existingGame.steamAppId &&
		!existingGame.apiDataComplete
	) {
		try {
			await enrichGameData('video_game', db, existingGame.steamAppId.toString());
		} catch (err) {
			console.error(
				`Failed to enrich game data for gameId ${gameId}:`,
				err instanceof Error ? err.message : err
			);
		}
	}

	return newCollectionItem;
}

export async function isGameInCollection(
	db: Database | DBTransaction,
	communityId: string,
	gameId: string
): Promise<boolean> {
	const [collectionItem] = await db
		.select()
		.from(communityCollections)
		.where(
			and(
				eq(communityCollections.communityId, communityId),
				eq(communityCollections.gameId, gameId),
				eq(communityCollections.isActive, true)
			)
		);

	return !!collectionItem;
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
