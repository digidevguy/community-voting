import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL not found in environment');
	process.exit(1);
}

async function getGameList() {
	// 1. Establish connection to database
	const client = postgres(DATABASE_URL!);
	const db = drizzle(client, { schema });

	// 2. Pull a random selection of games from the game table, retrieving the steamAppId and title values where the type property equals the string video_game. Store the selection.
	const selection = await db
		.select({
			id: schema.game.id,
			title: schema.game.title,
			steamAppId: schema.game.steamAppId
		})
		.from(schema.game)
		.where(eq(schema.game.type, 'video_game'))
		.orderBy(sql`RANDOM()`)
		.limit(10);

	// 3. Write the selection to a json file named test-games.json in the test-data directory
	const outputPath = join(process.cwd(), 'test-data', 'test.games.json');
	writeFileSync(outputPath, JSON.stringify(selection, null, 2), 'utf-8');

	console.log(`Wrote ${selection.length} games to ${outputPath}`);

	await client.end();
}

getGameList().catch((err) => {
	console.error('Fatal error: ', err);
	process.exit(1);
});
