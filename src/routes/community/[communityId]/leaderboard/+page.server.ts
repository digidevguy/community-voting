import { getCommunityLeaderboard } from '$lib/server/voting/winner-tracking.service';
import type { PageServerLoad } from './$types';

const LIMIT = 20;

function getPage(url: URL, key: string): number {
	return Math.max(1, Number(url.searchParams.get(key) ?? '1'));
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const data = await getCommunityLeaderboard(locals.db, params.communityId, {
		limit: LIMIT,
		gamesPage: getPage(url, 'gamesPage'),
		usersPage: getPage(url, 'usersPage'),
		recentPage: getPage(url, 'recentPage')
	});

	return { ...data, limit: LIMIT };
};
