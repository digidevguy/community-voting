import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { DBTransaction } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

const CHUNK_SIZE = 2000;
const CONCURRENCY = 4;

export const POST: RequestHandler = async ({ locals }) => {
	if (process.env.NODE_ENV !== 'development') {
		throw error(403, 'Not available in production');
	}

	let lastAppId: number = 0;
	let totalFetched: number = 0;
	let loopCount: number = 0;
	const allApps: Array<{ appid: number; name: string }> = [];

	console.log('Starting Steam app list sync...');

	while (true) {
		const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${env.STEAM_API_KEY}&max_results=50000&last_appid=${lastAppId}`;

		const res = await fetch(url);

		if (!res.ok) {
			throw error(500, `Unable to fetch Steam details: ${res.status}`);
		}

		const data = await res.json();
		const apps = data.response.apps;
		const haveMore = data.response.have_more_results;
		lastAppId = data.response.last_appid;

		allApps.push(...apps.filter((app: { name?: string }) => app.name));

		totalFetched += apps.length;
		loopCount++;

		console.log(`Fetched ${apps.length} apps, lastAppId=${lastAppId}, loop ${loopCount}`);

		if (!haveMore) break;
	}

	console.log(`Total apps fetched: ${allApps.length}`);

	const toUpsert = allApps.map((a) => ({
		title: a.name,
		type: 'video_game' as const,
		steamAppId: a.appid
	}));

	const chunks: (typeof toUpsert)[] = [];
	for (let i = 0; i < toUpsert.length; i += CHUNK_SIZE) {
		chunks.push(toUpsert.slice(i, i + CHUNK_SIZE));
	}

	let processed = 0;
	const total = toUpsert.length;
	const errors: string[] = [];

	async function worker() {
		while (true) {
			const chunk = chunks.shift();
			if (!chunk) break;

			try {
				await locals.db.transaction(async (tx: DBTransaction) => {
					// Use raw SQL to handle ON CONFLICT with the unique index
					for (const item of chunk) {
						await tx.execute(sql`
							INSERT INTO game (title, type, steam_app_id)
							VALUES (${item.title}, ${item.type}, ${item.steamAppId})
							ON CONFLICT (steam_app_id) WHERE steam_app_id IS NOT NULL
							DO NOTHING
						`);
					}
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

	// Process chunks concurrently
	await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

	console.log(`\nRefresh complete. Processed: ${processed}, Errors: ${errors.length}`);

	return json({
		message: 'Steam app list synced successfully',
		requests_made: loopCount,
		total_fetched: totalFetched,
		total_processed: processed,
		errors: errors.length,
		error_details: errors.length > 0 ? errors : undefined
	});
};
