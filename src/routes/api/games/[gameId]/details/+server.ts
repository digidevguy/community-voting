import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SteamGameResponse, Category, Genre } from '$lib/types';
import { sql } from 'drizzle-orm';
import { STEAM_API_DETAILS_URL } from '$env/static/private';

export const POST: RequestHandler = async ({ params }) => {
	const gameId = params.gameId;

	if (isNaN(Number(gameId))) {
		return new Response(JSON.stringify({ error: 'Invalid gameId' }), { status: 400 });
	}

	const game = await db
		.select()
		.from(table.game)
		.where(sql`${table.game.externalIds} ->> 'steamId' = ${gameId}`);

	// If not found or missing image, fetch from Steam API
	if (game.length === 0 || !game[0].image) {
		if (!STEAM_API_DETAILS_URL) {
			return new Response(
				JSON.stringify({ error: 'Server misconfiguration: missing STEAM_API_DETAILS_URL' }),
				{ status: 500 }
			);
		}

		const response = await fetch(`${STEAM_API_DETAILS_URL}?appids=${gameId}`);

		if (!response.ok) {
			console.log('row 58');
			console.error(`Steam API fetch failed with status: ${response.status}`);
			return new Response(
				JSON.stringify({ error: 'Failed to fetch game details from Steam API' }),
				{ status: 502 }
			);
		}

		const apiResponse: SteamGameResponse = await response.json();

		const app = apiResponse[gameId];

		if (!app || !app.success || !app.data) {
			console.log('row 63');
			return new Response(
				JSON.stringify({ error: 'Failed to fetch game details from Steam API' }),
				{ status: 502 }
			);
		}

		const gameData = app.data;

		const {
			header_image,
			short_description,
			developers = [],
			publishers = [],
			release_date,
			categories = [],
			genres = []
		} = gameData;

		const gameUpdate = await db
			.update(table.game)
			.set({
				image: header_image,
				description: short_description,
				developer: developers?.[0] ?? null,
				publisher: publishers?.[0] ?? null,
				releaseDate: release_date?.date ? new Date(release_date.date) : null,
				categories: (categories ?? []).map((c: Category) => c.description ?? ''),
				genres: (genres ?? []).map((g: Genre) => g.description ?? '')
			})
			.where(sql`${table.game.externalIds} ->> 'steamId' = ${gameId}`)
			.returning();

		if (!gameUpdate) {
			console.error(`Failed to update game with gameId: ${gameId}`);
		}

		return new Response(JSON.stringify(gameUpdate[0]), { status: 200 });
	}

	return new Response(JSON.stringify(game[0]), { status: 200 });
};
