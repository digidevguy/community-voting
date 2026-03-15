import { getInvitesByCommunity } from '$lib/server/communities/communities.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const communityId = params.communityId;

	return await getInvitesByCommunity(locals.db, communityId);
};

export const actions: Actions = {};
