import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import {
	confirmUserInCommunity,
	getCommunityInfo,
	getUserCommunityRole
} from '$lib/server/communities/communities.service';
import {
	addGameToCollectionWithEnrichment,
	deleteGameFromCollection,
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
		throw error(403, `You do not have access to this community`);
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
		const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
		if (!isMember) {
			return fail(403, { message: 'Not a member of this community' });
		}

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

		const formData = await request.formData();
		const searchTerm = formData.get('searchTerm')?.toString().trim() || '';

		if (!searchTerm || searchTerm.length < 2) {
			return fail(400, { message: 'Query must be at least 2 characters long.' });
		}

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

		const role = await getUserCommunityRole(locals.db, locals.user.id, communityId);

		if (!role) {
			return error(403, 'Unauthorized');
		}

		try {
			if (role !== 'member') {
				await deleteGameFromCollection(locals.db, communityId, gameId);
			} else {
				await softRemoveGameFromCollection(locals.db, communityId, locals.user.id, gameId);
			}

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
