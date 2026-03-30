import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { gameDetailsInputSchema } from '$lib/server/games/games.validation';
import { error, json } from '@sveltejs/kit';
import {
	findGameDetails,
	fetchSteamGameData,
	transformSteamData,
	updateGameDetails
} from '$lib/server/games/games.service';

export const POST: RequestHandler = async ({ locals, params }) => {
	const gameId = params.gameId;

	if (isNaN(Number(gameId))) {
		throw error(400, 'Invalid gameId');
	}

	const existingGame = await findGameDetails(locals.db, gameId);

	if (existingGame?.image) {
		return json(existingGame);
	}

	if (!env.STEAM_API_DETAILS_URL) {
		throw error(500, 'Server misconfiguration: missing STEAM_API_DETAILS_URL');
	}

	let steamApp;
	try {
		steamApp = await fetchSteamGameData(env.STEAM_API_DETAILS_URL, gameId);
	} catch (err) {
		console.error(`Steam API fetch failed for gameId ${gameId}:`, err);
		throw error(502, 'Failed to fetch game details from Steam API');
	}

	if (!steamApp) {
		throw error(404, 'Game not found on Steam');
	}

	const transformedData = transformSteamData(steamApp.data);
	const validated = gameDetailsInputSchema.parse(transformedData);

	try {
		const updatedGame = await updateGameDetails(locals.db, validated, gameId);

		if (!updatedGame) {
			throw error(500, 'Failed to update game in database');
		}

		return json(updatedGame);
	} catch (err) {
		console.error(`Failed to update game ${gameId}:`, err);
		throw error(500, 'Failed to update game');
	}
};
