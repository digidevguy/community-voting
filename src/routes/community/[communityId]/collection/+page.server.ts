import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import {
	confirmUserInCommunity,
	getCommunityInfo
} from '$lib/server/communities/communities.service';
import { getCommunityCollection } from '$lib/server/collections/collection.service';
import { fail } from '@sveltejs/kit';
import { game } from '$lib/server/db/schema';
import { ilike } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	const userInCommunity = await confirmUserInCommunity(
		locals.db,
		locals.user.id,
		params.communityId
	);

	if (!userInCommunity) {
		throw redirect(403, `You do not have access to this community`);
	}

	return {
		collection: await getCommunityCollection(locals.db, params.communityId),
		community: await getCommunityInfo(locals.db, params.communityId)
	};
};

export const actions: Actions = {
	add: async ({ locals, params, request }) => {
		// Todo: Add game to collection with enrichment
	},
	search: async ({ locals, request }) => {
		// Todo: Search for games
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		console.log('Game search requested by user:', locals.user.id);
		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim() || '';

		console.log('Query input:', query);
		if (!query || query.length < 2) {
			return fail(400, { message: 'Query must be at least 2 characters long.' });
		}

		console.log('Searching for games with query:', query);
		const games = await locals.db
			.select({
				id: game.id,
				title: game.title,
				steamAppId: game.steamAppId,
				type: game.type
			})
			.from(game)
			.where(ilike(game.title, `%${query}%`))
			.limit(10);

		console.log(`Found ${games.length} games matching query "${query}"`);
		return {
			games
		};
	},
	remove: async ({ locals, params, request }) => {
		// Todo: Soft delete game from collection
	}
};
