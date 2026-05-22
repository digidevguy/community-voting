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
import * as Sentry from '@sentry/sveltekit';

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

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
		Sentry.captureException(err, {
			tags: { userId: locals.user.id, gameId },
			extra: { context: 'Steam API fetch' }
		});
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
		Sentry.captureException(err, {
			tags: { userId: locals.user.id, gameId },
			extra: { context: 'DB update after Steam fetch' }
		});
		throw error(500, 'Failed to update game');
	}
};
