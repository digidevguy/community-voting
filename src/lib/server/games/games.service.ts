import type { Database, DBTransaction } from '$lib/server/db';
import { game } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { GameDetailsInput } from './games.validation';

// Find a games details from DB
export async function findGameDetails(db: Database | DBTransaction, gameId: string) {
	const [gameDetails] = await db
		.select()
		.from(game)
		.where(sql`${game.steamAppId} = ${gameId}`);

	return gameDetails;
}

// Update game details
export async function updateGameDetails(
	db: Database | DBTransaction,
	data: GameDetailsInput,
	gameId: string
) {
	const [updatedGame] = await db
		.update(game)
		.set(data)
		.where(sql`${game.steamAppId} = ${gameId}`);

	return updatedGame;
}
