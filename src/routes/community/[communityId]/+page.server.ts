import type { PageServerLoad } from './$types';
import {
	getCommunityInfo,
	confirmUserInCommunity
} from '$lib/server/communities/communities.service';
import { getCommunitySessions } from '$lib/server/voting/voting-session.service';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		return redirect(302, '/auth');
	}

	const userInCommunity = await confirmUserInCommunity(
		locals.db,
		locals.user.id,
		params.communityId
	);

	if (!userInCommunity) {
		return redirect(403, 'You do not have access to this community');
	}

	// Todo: Get community collection count

	return {
		community: await getCommunityInfo(locals.db, params.communityId),
		sessions: await getCommunitySessions(locals.db, params.communityId)
	};
};
