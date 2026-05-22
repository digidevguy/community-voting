import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/environment';
import { db } from '$lib/server/db';

const handleDevTools: Handle = ({ event, resolve }) => {
	if (dev && event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(undefined, { status: 404 });
	}
	return resolve(event);
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.db = db;
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	if (session?.user) {
		Sentry.setUser({ id: session?.user.id, email: session?.user.email, name: session?.user.name });
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// Todo: Use better-auth (hook or callback) event such as onSessionCreated / afterSignIn to track sign-in events

const handleCacheHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	if (
		response.headers.get('content-type')?.includes('text/html') &&
		!response.headers.has('Cache-Control')
	) {
		response.headers.set('Cache-Control', 'no-cache');
	}
	return response;
};

export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	sequence(handleDevTools, handleAuth, handleCacheHeaders)
);
export const handleError = Sentry.handleErrorWithSentry();
