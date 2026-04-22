import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const navigation = [
		{ href: '/community', label: 'Communities' },
		{ href: '/docs', label: 'Docs' },
		{ href: '/profile', label: 'Profile' }
	];

	return {
		user: locals.user,
		navigation
	};
};
