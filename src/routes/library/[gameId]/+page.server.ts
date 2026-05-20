import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findGameDetails } from '$lib/server/games/games.service';

export const config = { isr: { expiration: 3600 } };

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' });
	const { gameId } = params;

	if (!gameId) {
		return error(404, 'No game ID found');
	}

	return {
		game: await findGameDetails(locals.db, gameId)
	};
};
