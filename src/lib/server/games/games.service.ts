import type { Database, DBTransaction } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// Find a games details from DB
export async function findGameDetails(db: Database | DBTransaction, gameId: string) {
	const game = await db
		.select()
		.from(table.game)
		.where(sql`${table.game.steamAppId} = ${gameId}`);

	return game;
}

//  Save game to database
export async function saveGameDetails() {}

// Update game details
export async function updateGameDetails() {}
