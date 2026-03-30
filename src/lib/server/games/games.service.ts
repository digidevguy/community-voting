import { STEAM_API_DETAILS_URL } from '$env/dynamic/private';
import type { Database, DBTransaction } from '$lib/server/db';
import { game } from '$lib/server/db/schema';
import { eq, ilike } from 'drizzle-orm';
import type { GameDetailsInput } from './games.validation';
import type { Category, Genre, SteamGameResponse } from '$lib/types';

// Find a games details from DB
export async function findGameDetails(db: Database | DBTransaction, gameId: string) {
	const [gameDetails] = await db.select().from(game).where(eq(game.id, gameId));

	return gameDetails;
}

export async function searchGamesByTitle(
	db: Database | DBTransaction,
	searchTerm: string,
	limit = 10
) {
	return db
		.select({ id: game.id, title: game.title, steamAppId: game.steamAppId, type: game.type })
		.from(game)
		.where(ilike(game.title, `%${searchTerm}%`))
		.limit(limit);
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
		.where(eq(game.steamAppId, parseInt(gameId, 10)))
		.returning();

	return updatedGame;
}

export async function enrichGameData(
	gameType: 'video_game' | 'board_game',
	db: Database | DBTransaction,
	gameId: string
) {
	if (!STEAM_API_DETAILS_URL) {
		throw new Error('Server misconfiguration: missing STEAM_API_DETAILS_URL');
	}

	const appData = await fetchSteamGameData(STEAM_API_DETAILS_URL, gameId);

	if (!appData) {
		throw new Error('Game not found on Steam');
	}

	const transformedData = transformSteamData(appData.data);

	const updatedGame = await db
		.update(game)
		.set({
			...transformedData,
			lastApiSync: new Date(),
			apiDataComplete: true,
			updatedAt: new Date()
		})
		.where(eq(game.steamAppId, parseInt(gameId, 10)))
		.returning();

	if (!updatedGame) {
		throw new Error('Failed to update game in database');
	}

	return updatedGame;
}

export async function fetchSteamGameData(
	apiUrl: string,
	gameId: string
): Promise<SteamGameResponse[string] | null> {
	const response = await fetch(`${apiUrl}?appids=${gameId}`);

	if (!response.ok) {
		throw new Error(`Steam API returned status ${response.status}`);
	}

	const apiResponse: SteamGameResponse = await response.json();
	const app = apiResponse[gameId];

	if (!app || !app.success || !app.data) {
		return null;
	}

	return app;
}

export function transformSteamData(steamData: SteamGameResponse[string]['data']): GameDetailsInput {
	const {
		header_image,
		short_description,
		developers = [],
		publishers = [],
		release_date,
		categories = [],
		genres = []
	} = steamData;

	return {
		image: header_image,
		description: short_description,
		developer: developers?.[0] ?? null,
		publisher: publishers?.[0] ?? null,
		releaseDate: parseSteamDate(release_date?.date) ?? undefined,
		categories: (categories ?? []).map((c: Category) => c.description ?? ''),
		genres: (genres ?? []).map((g: Genre) => g.description ?? '')
	};
}

function parseSteamDate(dateString: string | undefined): Date | null {
	if (!dateString) return null;

	const isValidFormat =
		!/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dateString) ||
		!/^\w{3}\s+\d{1,2},\s+\d{4}$/.test(dateString);

	if (!isValidFormat) {
		console.warn(`Invalid Steam date format: ${dateString}`);
		return null;
	}

	const parsed = new Date(dateString);
	return isNaN(parsed.getTime()) ? null : parsed;
}
