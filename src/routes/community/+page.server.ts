import { getMyCommunities } from '$lib/server/communities/communities.service';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	return {
		communities: await getMyCommunities(locals.db, locals.user.id)
	};
};
