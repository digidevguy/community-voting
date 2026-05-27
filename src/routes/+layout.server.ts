import type { LayoutServerLoad } from './$types';
import {
	getUnreadCount,
	getRecentNotifications
} from '$lib/server/notifications/notifications.service';

export type BannerConfig = {
	enabled: boolean;
	message: string;
	type: 'info' | 'warning' | 'caution';
	/** Optional CTA link rendered inline after the message text. */
	link?: { href: string; label: string };
	/**
	 * localStorage key used to persist the dismissed state.
	 * Bump this (e.g. 'beta-notice-v2') to show the banner again after a message change.
	 */
	storageKey: string;
};

const banner: BannerConfig = {
	enabled: true,
	message:
		'Community Voting is under active development. Features and behaviour may change without notice.',
	type: 'warning',
	link: { href: '/docs', label: 'Learn more' },
	storageKey: 'global-notice-beta-v1'
};

export const load: LayoutServerLoad = async ({ locals }) => {
	const navigation = [
		{ href: '/community', label: 'Communities' },
		{ href: '/docs', label: 'Docs' },
		{ href: '/profile', label: 'Profile' }
	];

	let unreadCount = 0;
	let recentNotifications: Awaited<ReturnType<typeof getRecentNotifications>> | undefined;
	if (locals.user) {
		const db = locals.db;
		[unreadCount, recentNotifications] = await Promise.all([
			getUnreadCount(db, locals.user.id),
			getRecentNotifications(db, locals.user.id, 5)
		]);
	}

	return {
		user: locals.user,
		unreadCount,
		recentNotifications,
		navigation,
		banner
	};
};
