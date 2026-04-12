import { communityCollections, game, user } from '$lib/server/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getUserCommunityRole } from '$lib/server/communities/communities.service';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { community, userRole } = await parent();

	const addedByUser = alias(user, 'added_by_user');
	const removedByUser = alias(user, 'removed_by_user');

	const collection = await locals.db
		.select({
			id: communityCollections.id,
			addedBy: {
				id: addedByUser.id,
				name: addedByUser.name
			},
			addedAt: communityCollections.addedAt,
			isActive: communityCollections.isActive,
			removedBy: {
				id: removedByUser.id,
				name: removedByUser.name
			},
			removedAt: communityCollections.removedAt,
			game: {
				id: game.id,
				title: game.title,
				apiDataComplete: game.apiDataComplete,
				categories: game.categories,
				genres: game.genres
			},
			timesUsed: sql<number>`(
				SELECT CAST(COUNT(*) AS integer)
				FROM voting_option vo
				INNER JOIN voting_session vs ON vo.voting_session_id = vs.id
				WHERE vo.game_id = ${communityCollections.gameId}
				AND vs.community_id = ${communityCollections.communityId}
			)`,
			timesWon: sql<number>`(
				SELECT CAST(COUNT(*) AS integer)
				FROM voting_session vs
				INNER JOIN voting_option vo ON vs.selected_option_id = vo.id
				WHERE vo.game_id = ${communityCollections.gameId}
				AND vs.community_id = ${communityCollections.communityId}
			)`
		})
		.from(communityCollections)
		.innerJoin(game, eq(communityCollections.gameId, game.id))
		.leftJoin(addedByUser, eq(communityCollections.addedBy, addedByUser.id))
		.leftJoin(removedByUser, eq(communityCollections.removedBy, removedByUser.id))
		.where(eq(communityCollections.communityId, community.id))
		.orderBy(asc(game.title));

	return { collection, community, userRole };
};

export const actions: Actions = {
	reactivate: async ({ locals, request, params }) => {
		if (!locals.user) {
			return redirect(302, '/auth');
		}

		const role = await getUserCommunityRole(locals.db, locals.user.id, params.communityId);

		if (!role || (role !== 'moderator' && role !== 'admin')) {
			return fail(403, { message: 'You are not authorized to acces this route' });
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId')?.toString();

		if (!gameId) {
			return fail(400, { message: 'Invalid game selected' });
		}

		try {
			const [item] = await locals.db
				.update(communityCollections)
				.set({ isActive: true, removedAt: null, removedBy: null })
				.where(
					and(
						eq(communityCollections.communityId, params.communityId),
						eq(communityCollections.gameId, gameId)
					)
				)
				.returning();

			if (!item) {
				return fail(400, { message: 'Game not found in community collection' });
			}

			return { success: true };
		} catch (error) {
			console.error(
				'Error removing game from collection:',
				error instanceof Error ? error.message : error
			);
			return fail(500, { message: 'Failed to remove game from collection' });
		}
	},

	remove: async ({ locals, request, params }) => {
		if (!locals.user) {
			return redirect(302, '/auth');
		}

		const role = await getUserCommunityRole(locals.db, locals.user.id, params.communityId);

		if (!role || (role !== 'moderator' && role !== 'admin')) {
			return fail(403, { message: 'You are not authorized to access this route' });
		}

		const formData = await request.formData();
		const gameId = formData.get('gameId')?.toString();

		if (!gameId) {
			return fail(400, { message: 'Invalid game selected' });
		}

		try {
			const [deleted] = await locals.db
				.delete(communityCollections)
				.where(
					and(
						eq(communityCollections.communityId, params.communityId),
						eq(communityCollections.gameId, gameId)
					)
				)
				.returning();

			if (!deleted) {
				return fail(400, { message: 'Game not found in community collection' });
			}

			return { success: true };
		} catch (error) {
			console.error(
				'Error hard-deleting game from collection:',
				error instanceof Error ? error.message : error
			);
			return fail(500, { message: 'Failed to delete game from collection' });
		}
	}
};
