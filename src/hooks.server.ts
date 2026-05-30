import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/environment';
import { db } from '$lib/server/db';
import {
	authLimiter,
	steamInitiateLimiter,
	steamCallbackLimiter,
	imageUploadLimiter,
	pushSubscribeLimiter,
	writeActionLimiter,
	checkRateLimit
} from '$lib/server/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

type KeyStrategy = 'ip' | 'user';

interface RateLimitRule {
	methods: string[];
	match: (pathname: string) => boolean;
	limiter: Ratelimit;
	keyStrategy: KeyStrategy;
	keyPrefix: string;
}

const RATE_LIMIT_RULES: RateLimitRule[] = [
	{
		methods: ['POST'],
		match: (p) => p.startsWith('/api/auth/'),
		limiter: authLimiter,
		keyStrategy: 'ip',
		keyPrefix: 'auth'
	},
	{
		methods: ['GET'],
		match: (p) => p === '/api/steam/initiate',
		limiter: steamInitiateLimiter,
		keyStrategy: 'user',
		keyPrefix: 'steam-initiate'
	},
	{
		methods: ['GET'],
		match: (p) => p === '/api/steam/callback',
		limiter: steamCallbackLimiter,
		keyStrategy: 'ip',
		keyPrefix: 'steam-callback'
	},
	{
		methods: ['POST'],
		match: (p) => p === '/api/images/upload',
		limiter: imageUploadLimiter,
		keyStrategy: 'user',
		keyPrefix: 'image-upload'
	},
	{
		methods: ['POST', 'DELETE'],
		match: (p) => p === '/api/push/subscribe',
		limiter: pushSubscribeLimiter,
		keyStrategy: 'user',
		keyPrefix: 'push-subscribe'
	},
	{
		methods: ['PATCH'],
		match: (p) => p === '/api/notifications/read',
		limiter: writeActionLimiter,
		keyStrategy: 'user',
		keyPrefix: 'write'
	},
	{
		methods: ['POST'],
		match: (p) => p.startsWith('/voting/'),
		limiter: writeActionLimiter,
		keyStrategy: 'user',
		keyPrefix: 'write'
	},
	{
		methods: ['POST'],
		match: (p) => p.startsWith('/community/') && p.endsWith('/invites'),
		limiter: writeActionLimiter,
		keyStrategy: 'user',
		keyPrefix: 'write'
	},
	{
		methods: ['POST'],
		match: (p) => p === '/community/create',
		limiter: writeActionLimiter,
		keyStrategy: 'user',
		keyPrefix: 'write'
	}
];

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

function rateLimitResponse(retryAfter: number): Response {
	return new Response(JSON.stringify({ message: 'Too many requests' }), {
		status: 429,
		headers: {
			'Content-Type': 'application/json',
			'Retry-After': String(retryAfter)
		}
	});
}

const handleRateLimit: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const method = event.request.method;
	const ip = event.getClientAddress();
	const userId = event.locals.user?.id;

	const rule = RATE_LIMIT_RULES.find((r) => r.methods.includes(method) && r.match(pathname));

	if (rule) {
		const identifier = rule.keyStrategy === 'ip' ? ip : (userId ?? ip);
		const key = `${rule.keyPrefix}:${identifier}`;
		const { allowed, retryAfter } = await checkRateLimit(rule.limiter, key);
		if (!allowed) {
			Sentry.metrics.count('rate_limit.rejected', 1, {
				attributes: { path: pathname, method }
			});
			return rateLimitResponse(retryAfter);
		}
	}

	return resolve(event);
};

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=()'
	);
	// HSTS is only meaningful over HTTPS; skip in dev to avoid locking the browser to HTTPS on localhost
	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};

export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	sequence(handleDevTools, handleAuth, handleRateLimit, handleCacheHeaders, handleSecurityHeaders)
);
export const handleError = Sentry.handleErrorWithSentry();
