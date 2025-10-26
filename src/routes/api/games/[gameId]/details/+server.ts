import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SteamGameResponse } from '$lib/types';
import { sql } from 'drizzle-orm';
import { STEAM_API_DETAILS_URL } from '$env/static/private';

export const POST: RequestHandler = async ({ params }) => {
	const gameId = params.gameId;
	console.log(`Fetching details for gameId: ${gameId}`);

	// Handle case where gameId is not a valid number

	/**
	 * Query the database to get the game details by gameId
	 * if found, return the game details as JSON
	 * if not found, fetch from external API (Steam API)
	 * if found in external API, insert into database and return details
	 * if not found in external API, return 404
	 */

	// Query database for game with matching steamId in externalIds
	const game = await db
		.select()
		.from(table.game)
		.where(sql`${table.game.externalIds} ->> 'steamId' = ${gameId}`);

	// If not found or missing image, fetch from Steam API
	if (game.length === 0 || !game[0].image) {
		// Fetch from Steam API
		const response = await fetch(`${STEAM_API_DETAILS_URL}?appids=${gameId}`);

		// If Steam API fetch fails, return 502
		if (!response.ok) {
			return new Response(
				JSON.stringify({ error: 'Failed to fetch game details from Steam API' }),
				{ status: 502 }
			);
		}

		// Save response to database and return results
		const { data }: SteamGameResponse = await response.json();

		if (!data[gameId] || !data[gameId].success) {
			return new Response(
				JSON.stringify({ error: 'Failed to fetch game details from Steam API' }),
				{ status: 502 }
			);
		}

		return new Response(JSON.stringify({ data }), { status: 200 });
	}

	return new Response(JSON.stringify(game[0]), { status: 200 });
};
