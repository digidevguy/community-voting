import { getMyCommunities } from '$lib/server/communities/communities.service';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/auth');
	}

	return {
		communities: getMyCommunities(locals.db, locals.user.id)
	};
};
