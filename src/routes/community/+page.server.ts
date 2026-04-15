import { getMyCommunities } from '$lib/server/communities/communities.service';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	// Return the promise without awaiting so SvelteKit streams the response:
	// the page shell (header, skeleton) is sent immediately while the query runs.
	return {
		communities: getMyCommunities(locals.db, locals.user.id)
	};
};
