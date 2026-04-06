import { error, redirect } from '@sveltejs/kit';
import {
	getCommunityInfo,
	getUserCommunityRole,
	isPrivilegedRole
} from '$lib/server/communities/communities.service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		return redirect(302, '/auth');
	}

	let community, userRole;

	try {
		[community, userRole] = await Promise.all([
			getCommunityInfo(locals.db, params.communityId),
			getUserCommunityRole(locals.db, locals.user.id, params.communityId)
		]);
	} catch {
		throw error(404, 'Community not found');
	}

	console.log(userRole);
	if (!isPrivilegedRole(userRole)) {
		return redirect(302, `/community/${params.communityId}`);
	}

	return { community, userRole };
};
