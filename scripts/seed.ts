import { randomUUID } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL not found in environment');
	process.exit(1);
}

const STEAM_LIST_URL = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';

async function seed() {
	const client = postgres(DATABASE_URL!);
	const db = drizzle(client, { schema });

	console.log('Fetching Steam app list...');
	const response = await fetch(STEAM_LIST_URL);
	if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

	const data = await response.json();
	const apps: Array<{ appid: number; name: string }> = data.applist.apps;
	console.log(`Fetched ${apps.length} apps.`);

	const toInsert = apps.map((a) => ({
		id: randomUUID(),
		title: a.name,
		type: 'video_game' as const,
		externalIds: { steamId: a.appid }
	}));

	const chunkSize = 2000;
	const concurrency = 4;
	const chunks: (typeof toInsert)[] = [];
	for (let i = 0; i < toInsert.length; i += chunkSize) {
		chunks.push(toInsert.slice(i, i + chunkSize));
	}

	let processed = 0;
	const total = toInsert.length;
	const errors: string[] = [];

	async function worker() {
		while (true) {
			const chunk = chunks.shift();
			if (!chunk) break;
			try {
				await db.transaction(async (tx) => {
					await tx.insert(schema.game).values(chunk);
				});
				processed += chunk.length;
				console.log(`✓ ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%)`);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				errors.push(msg);
				console.error('✗ Chunk error:', msg);
			}
		}
	}

	await Promise.all(Array.from({ length: concurrency }, () => worker()));
	console.log(`\nSeed complete. Inserted: ${processed}, Errors: ${errors.length}`);

	await client.end();
	process.exit(errors.length > 0 ? 1 : 0);
}

seed().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
