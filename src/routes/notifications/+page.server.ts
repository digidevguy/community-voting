import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAllNotifications } from '$lib/server/notifications/notifications.service';

const LIMIT = 20;

function getPage(url: URL): number {
	const parsed = parseInt(url.searchParams.get('page') ?? '1', 10);
	return Math.max(1, isNaN(parsed) ? 1 : parsed);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const filterParam = url.searchParams.get('filter');
	const effectiveFilter = filterParam === 'all' ? 'all' : 'unread';
	const isRead = effectiveFilter === 'unread' ? false : undefined;

	const { notifications, total } = await getAllNotifications(
		locals.db,
		locals.user.id,
		getPage(url),
		LIMIT,
		isRead
	);

	return {
		notifications,
		total,
		filter: effectiveFilter,
		page: getPage(url)
	};
};
