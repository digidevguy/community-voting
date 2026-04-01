import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { db } from '$lib/server/db';

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.db = db;
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleAuth;
