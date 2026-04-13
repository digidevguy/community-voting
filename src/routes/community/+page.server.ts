import {
	getMyCommunities,
	getOwnedCommunitiesCount
} from '$lib/server/communities/communities.service';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	return {
		communities: await getMyCommunities(locals.db, locals.user.id),
		ownedCommunityCount: await getOwnedCommunitiesCount(locals.db, locals.user.id)
	};
};
