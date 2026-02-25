import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findGameDetails } from '$lib/server/games/games.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { gameId } = params;

	if (!gameId) {
		return error(404, 'No game ID found');
	}

	return {
		game: await findGameDetails(locals.db, gameId)
	};
};
