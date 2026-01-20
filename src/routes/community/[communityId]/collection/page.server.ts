import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from '../$types';
import {
	confirmUserInCommunity,
	getCommunityInfo
} from '$lib/server/communities/communities.service';
import { getCommunityCollection } from '$lib/server/collections/collection.service';

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
	search: async ({ locals, params, request }) => {
		// Todo: Search for games
	},
	remove: async ({ locals, params, request }) => {
		// Todo: Soft delete game from collection
	}
};
