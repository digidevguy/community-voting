import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const navigation = [
		{ href: '/community', label: 'Community' },
		{ href: '/profile', label: 'Profile' }
	];

	return {
		user: locals.user,
		navigation
	};
};
