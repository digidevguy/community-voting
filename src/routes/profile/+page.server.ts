import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const [dbUser] = await locals.db
		.select({ steamId: user.steamId })
		.from(user)
		.where(eq(user.id, locals.user.id));

	return {
		steamId: dbUser?.steamId ?? null
	};
};
