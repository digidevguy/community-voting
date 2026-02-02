import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import {
	confirmUserInCommunity,
	getCommunityInfo
} from '$lib/server/communities/communities.service';
import {
	addGameToCollectionWithEnrichment,
	getCommunityCollection,
	isGameInCollection,
	softRemoveGameFromCollection
} from '$lib/server/collections/collection.service';
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
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const communityId = params.communityId;
		const formData = await request.formData();
		const gameId = formData.get('gameId')?.toString();
		if (!gameId) {
			return fail(400, { message: 'Invalid game selected' });
		}

		const isInCollection = await isGameInCollection(locals.db, communityId, gameId);
		if (isInCollection) {
			return fail(400, { message: 'Game is already in the collection' });
		}

		try {
			console.log('Adding game to collection:', { communityId, gameId, userId: locals.user.id });
			const addedCollectionItem = await addGameToCollectionWithEnrichment(
				locals.db,
				communityId,
				locals.user.id,
				gameId
			);
			return { success: true, addedCollectionItem };
		} catch (error) {
			console.error(
				'Error adding game to collection:',
				error instanceof Error ? error.message : error
			);
			return fail(500, { message: 'Failed to add game to collection' });
		}
	},
	search: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		console.log('Game search requested by user:', locals.user.id);
		const formData = await request.formData();
		const searchTerm = formData.get('searchTerm')?.toString().trim() || '';

		console.log('Query input:', searchTerm);
		if (!searchTerm || searchTerm.length < 2) {
			return fail(400, { message: 'Query must be at least 2 characters long.' });
		}

		console.log('Searching for games with query:', searchTerm);
		const games = await locals.db
			.select({
				id: game.id,
				title: game.title,
				steamAppId: game.steamAppId,
				type: game.type
			})
			.from(game)
			.where(ilike(game.title, `%${searchTerm}%`))
			.limit(10);

		console.log(`Found ${games.length} games matching query "${searchTerm}"`);
		return {
			games
		};
	},
	remove: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const communityId = params.communityId;
		const formData = await request.formData();
		const gameId = formData.get('gameId')?.toString();

		if (!gameId) {
			return fail(400, { message: 'Invalid game selected' });
		}
		console.log('Removing game from collection:', { communityId, gameId, userId: locals.user.id });

		try {
			await softRemoveGameFromCollection(locals.db, communityId, locals.user.id, gameId);
			return { success: true };
		} catch (error) {
			console.error(
				'Error removing game from collection:',
				error instanceof Error ? error.message : error
			);
			return fail(500, { message: 'Failed to remove game from collection' });
		}
	}
};
