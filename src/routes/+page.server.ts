import type { Actions } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const STEAM_LIST_URL = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';

export const actions: Actions = {
	seed: async () => {
		console.log('Seeding Steam app list into game table...');
		const response = await fetch(STEAM_LIST_URL);
		if (!response.ok) {
			return {
				status: response.status,
				body: { error: 'Failed to fetch Steam app list', details: await response.text() }
			};
		}

		const data = await response.json();
		const apps: Array<{ appid: number; name: string }> = data.applist.apps;
		console.log(`Fetched ${apps.length} apps from Steam.`);
		// Map Steam app list to our game table shape.
		// We'll only set the minimal fields: id (UUID string), title, and externalIds with steamId.
		// Use the appid as the steamId and name as title. We'll generate a UUID for id.
		const toInsert = apps.map((a) => ({
			id: `steam:${a.appid}`,
			title: a.name,
			type: 'video_game' as const,
			externalIds: { steamId: a.appid }
		}));

		// Insert in batches to avoid too-large single insert
		const chunkSize = 1000;
		const results: Array<{ inserted: number }> = [];

		console.log(`Inserting apps into database in chunks of ${chunkSize}...`);
		for (let i = 0; i < toInsert.length; i += chunkSize) {
			const chunk = toInsert.slice(i, i + chunkSize);
			await db.insert(table.game).values(chunk);
			results.push({ inserted: chunk.length });
		}

		const inserted = results.reduce((s, r) => s + r.inserted, 0);

		const sample = toInsert
			.slice(0, 10)
			.map((r) => ({ title: r.title, steamId: r.externalIds.steamId }));

		return { inserted, sample };
	}
} satisfies Actions;
