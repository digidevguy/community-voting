import { communityCollections, game, gameStatistics, user } from '$lib/server/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getUserCommunityRole } from '$lib/server/communities/communities.service';
import { collectionGameActionSchema } from '$lib/server/collections/collection.validation';
import * as Sentry from '@sentry/sveltekit';

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
			timesUsed: sql<number>`coalesce(${gameStatistics.timesUsed}, 0)`,
			timesWon: sql<number>`coalesce(${gameStatistics.timesWon}, 0)`
		})
		.from(communityCollections)
		.innerJoin(game, eq(communityCollections.gameId, game.id))
		.leftJoin(
			gameStatistics,
			and(
				eq(gameStatistics.communityId, communityCollections.communityId),
				eq(gameStatistics.gameId, communityCollections.gameId)
			)
		)
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
			return fail(403, { message: 'You are not authorized to access this route' });
		}

		const formData = await request.formData();
		const parsed = collectionGameActionSchema.safeParse({ gameId: formData.get('gameId') });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid game selected' });
		}
		const { gameId } = parsed.data;

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
			Sentry.logger.info('Collection game reactivated', {
				userId: locals.user.id,
				communityId: params.communityId,
				gameId
			});
			return { success: true };
		} catch (err) {
			Sentry.captureException(err, {
				tags: { communityId: params.communityId, userId: locals.user.id, gameId }
			});
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
		const parsed = collectionGameActionSchema.safeParse({ gameId: formData.get('gameId') });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid game selected' });
		}
		const { gameId } = parsed.data;

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
			Sentry.logger.info('Collection game hard deleted', {
				userId: locals.user.id,
				communityId: params.communityId,
				gameId
			});
			return { success: true };
		} catch (err) {
			Sentry.captureException(err, {
				tags: { communityId: params.communityId, userId: locals.user.id, gameId }
			});
			return fail(500, { message: 'Failed to delete game from collection' });
		}
	}
};
