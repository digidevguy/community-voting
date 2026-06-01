import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import {
	confirmUserInCommunity,
	getCommunityInfo,
	getUserCommunityMembership,
	getUserCommunityRole,
	canAddToCollection
} from '$lib/server/communities/communities.service';
import {
	addGameToCollectionWithEnrichment,
	deleteGameFromCollection,
	getCommunityCollection,
	getUserLibrarySuggestionsForCommunity,
	softRemoveGameFromCollection,
	getCommunityGameOwners
} from '$lib/server/collections/collection.service';
import { searchGamesByTitle } from '$lib/server/games/games.service';
import { getUserSteamId } from '$lib/server/users/users.service';
import { fail } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import {
	collectionGameActionSchema,
	collectionSearchSchema
} from '$lib/server/collections/collection.validation';

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

	const [collection, communityInfo, gameOwners, steamId, membership] = await Promise.all([
		getCommunityCollection(locals.db, params.communityId),
		getCommunityInfo(locals.db, params.communityId),
		getCommunityGameOwners(locals.db, params.communityId),
		getUserSteamId(locals.db, locals.user.id),
		getUserCommunityMembership(locals.db, locals.user.id, params.communityId)
	]);

	const suggestedGames = steamId
		? await getUserLibrarySuggestionsForCommunity(locals.db, locals.user.id, params.communityId)
		: [];

	const ownersByGame = Object.groupBy(gameOwners, (o) => o.gameId);

	return {
		collection,
		community: communityInfo,
		ownersByGame,
		suggestedGames,
		canAdd: canAddToCollection(
			communityInfo,
			membership?.role ?? null,
			membership?.membershipExpiresAt
		)
	};
};

export const actions: Actions = {
	add: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const communityId = params.communityId;
		const [communityInfo, membership] = await Promise.all([
			getCommunityInfo(locals.db, communityId),
			getUserCommunityMembership(locals.db, locals.user.id, communityId)
		]);
		if (!membership) {
			return fail(403, { message: 'Not a member of this community' });
		}
		if (!canAddToCollection(communityInfo, membership.role, membership.membershipExpiresAt)) {
			return fail(403, {
				message: 'You do not have permission to add games to this community collection'
			});
		}

		const formData = await request.formData();
		const parsed = collectionGameActionSchema.safeParse({ gameId: formData.get('gameId') });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid game selected' });
		}
		const { gameId } = parsed.data;

		try {
			const addedCollectionItem = await addGameToCollectionWithEnrichment(
				locals.db,
				communityId,
				locals.user.id,
				gameId
			);
			return { success: true, addedCollectionItem };
		} catch (err) {
			if (err instanceof Error && err.message === 'Game already exists in collection') {
				return fail(400, { message: 'Game is already in the collection' });
			}
			Sentry.captureException(err, {
				tags: { communityId, userId: locals.user.id, gameId }
			});
			return fail(500, { message: 'Failed to add game to collection' });
		}
	},
	search: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const formData = await request.formData();
		const parsed = collectionSearchSchema.safeParse({ searchTerm: formData.get('searchTerm') });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid search query.' });
		}
		const { searchTerm } = parsed.data;

		const games = await searchGamesByTitle(locals.db, searchTerm);

		return { games };
	},
	remove: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const communityId = params.communityId;
		const formData = await request.formData();
		const parsed = collectionGameActionSchema.safeParse({ gameId: formData.get('gameId') });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid game selected' });
		}
		const { gameId } = parsed.data;

		const role = await getUserCommunityRole(locals.db, locals.user.id, communityId);

		if (!role) {
			return fail(403, { message: 'Unauthorized' });
		}

		try {
			if (role !== 'member') {
				await deleteGameFromCollection(locals.db, communityId, gameId);
			} else {
				await softRemoveGameFromCollection(locals.db, communityId, locals.user.id, gameId);
			}

			return { success: true };
		} catch (err) {
			Sentry.captureException(err, {
				tags: { comunityId: params.communityId, userId: locals.user.id }
			});
			return fail(500, { message: 'Failed to remove game from collection' });
		}
	}
};
