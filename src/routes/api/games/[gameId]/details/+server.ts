import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { SteamGameResponse, Category, Genre } from '$lib/types';
import { sql } from 'drizzle-orm';
import { STEAM_API_DETAILS_URL } from '$env/static/private';
import { gameDetailsInputSchema } from '$lib/server/games/games.validation';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params }) => {
	const gameId = params.gameId;

	if (isNaN(Number(gameId))) {
		return new Response(JSON.stringify({ error: 'Invalid gameId' }), { status: 400 });
	}

	const game = await db
		.select()
		.from(table.game)
		.where(sql`${table.game.steamAppId} = ${gameId}`);

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

		function parseSteamDate(dateString: string | undefined): Date | null {
			if (!dateString) return null;

			if (
				!/^\d{1,2}[/-]\d{1,2}[/-]{4}$/.test(dateString) &&
				!/^\w{3}\s+\d{1,2},\s+\d{4}$/.test(dateString)
			) {
				console.warn(`Invalid Steam date format: ${dateString}`);
				return null;
			}

			const parsed = new Date(dateString);
			return isNaN(parsed.getTime()) ? null : parsed;
		}

		const updated = {
			image: header_image,
			description: short_description,
			developer: developers?.[0] ?? null,
			publisher: publishers?.[0] ?? null,
			releaseDate: parseSteamDate(release_date?.date),
			categories: (categories ?? []).map((c: Category) => c.description ?? ''),
			genres: (genres ?? []).map((g: Genre) => g.description ?? '')
		};

		const validated = gameDetailsInputSchema.parse(updated);

		const gameUpdate = await db
			.update(table.game)
			.set(validated)
			.where(sql`${table.game.steamAppId} = ${gameId}`)
			.returning();

		if (!gameUpdate) {
			console.error(`Failed to update game with gameId: ${gameId}`);
			return error(500, 'Failed to update game');
		}

		return new Response(JSON.stringify(gameUpdate[0]), { status: 200 });
	}

	return new Response(JSON.stringify(game[0]), { status: 200 });
};
