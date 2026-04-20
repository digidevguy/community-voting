import { fail, redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { game, userGameLibrary } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { getUserSteamId } from '$lib/server/users/users.service';
import { env } from '$env/dynamic/private';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const steamId = await getUserSteamId(locals.db, locals.user.id);

	return {
		steamId
	};
};

export const actions: Actions = {
	syncLibrary: async ({ locals }) => {
		if (!locals.user) {
			throw redirect(302, '/auth');
		}

		// steamId already available from load, but actions run independently —
		// re-query to guard against unlinked accounts and stale session data
		const steamId = await getUserSteamId(locals.db, locals.user.id);

		if (!steamId) {
			return fail(400, { message: 'Steam account not linked' });
		}

		const response = await fetch(
			`${env.STEAM_API_USER_LIBRARY_URL}?key=${env.STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&format=json`
		);

		if (!response.ok) {
			return fail(502, { message: 'Failed to reach Steam API' });
		}

		const { response: steamResponse } = await response.json();

		if (!steamResponse?.games?.length) {
			return fail(400, { message: 'No games found in Steam library or library is private' });
		}

		const games: Array<{ appid: number; name: string }> = steamResponse.games;

		// Upsert stub rows for any games not yet in the catalog and resolve internal IDs in one round-trip
		const resolvedGames = await locals.db
			.insert(game)
			.values(
				games.map((g) => ({
					id: randomUUID(),
					title: g.name,
					type: 'video_game' as const,
					steamAppId: g.appid
				}))
			)
			.onConflictDoUpdate({
				target: game.steamAppId,
				targetWhere: sql`${game.steamAppId} IS NOT NULL`,
				set: { steamAppId: game.steamAppId }
			})
			.returning({ id: game.id, steamAppId: game.steamAppId });

		const appIdToGameId = new Map(resolvedGames.map((g) => [g.steamAppId, g.id]));

		const now = new Date();
		const libraryRows = games.flatMap((g) => {
			const gameId = appIdToGameId.get(g.appid);
			if (!gameId) return [];
			return [{ id: randomUUID(), userId: locals.user!.id, gameId, addedAt: now, lastSynced: now }];
		});

		await locals.db
			.insert(userGameLibrary)
			.values(libraryRows)
			.onConflictDoUpdate({
				target: [userGameLibrary.userId, userGameLibrary.gameId],
				set: { lastSynced: now }
			});

		return { synced: libraryRows.length };
	}
};
