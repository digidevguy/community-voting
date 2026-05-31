import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

// In dev, skip all rate limiting so a local Redis instance isn't required.
const noop = {
	limit: async () => ({
		success: true,
		reset: 0,
		remaining: 9999,
		limit: 9999,
		pending: Promise.resolve()
	})
} as unknown as Ratelimit;

function makeRedis(): Redis {
	if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
		throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
	}
	return new Redis({
		url: env.UPSTASH_REDIS_REST_URL,
		token: env.UPSTASH_REDIS_REST_TOKEN
	});
}

// Lazily initialised so the module can be imported during the build step
// without requiring the env vars to be present.
let _redis: Redis | null = null;
function getRedis(): Redis {
	if (!_redis) _redis = makeRedis();
	return _redis;
}

function makeLimiter(
	tokens: number,
	window: `${number} ${'s' | 'ms' | 'm' | 'h' | 'd'}`
): Ratelimit {
	if (dev) return noop;
	return new Ratelimit({
		redis: getRedis(),
		limiter: Ratelimit.slidingWindow(tokens, window),
		analytics: false
	});
}

/**
 * 10 req / 15 min per IP
 * Applied to: POST /api/auth/* (sign-in, sign-up, etc.)
 */
export const authLimiter = makeLimiter(10, '15 m');

/**
 * 5 req / 1 min per user
 * Applied to: GET /api/steam/initiate
 */
export const steamInitiateLimiter = makeLimiter(5, '1 m');

/**
 * 10 req / 1 min per IP
 * Applied to: GET /api/steam/callback
 */
export const steamCallbackLimiter = makeLimiter(10, '1 m');

/**
 * 10 req / 1 hour per user
 * Applied to: POST /api/images/upload
 */
export const imageUploadLimiter = makeLimiter(10, '1 h');

/**
 * 20 req / 1 hour per user
 * Applied to: POST /api/push/subscribe, DELETE /api/push/subscribe
 */
export const pushSubscribeLimiter = makeLimiter(20, '1 h');

/**
 * 30 req / 1 min per user
 * Applied to: PATCH /api/notifications/read, form actions for castVote /
 * createInvite / community create.
 */
export const writeActionLimiter = makeLimiter(30, '1 m');

/**
 * 5 req / 1 hour per user per community
 * Applied to: community invite creation (prevents invite flooding).
 */
export const inviteCreateLimiter = makeLimiter(5, '1 h');

export interface RateLimitResult {
	allowed: boolean;
	/** Seconds until the window resets. 0 when the request is allowed. */
	retryAfter: number;
}

export async function checkRateLimit(limiter: Ratelimit, key: string): Promise<RateLimitResult> {
	const { success, reset } = await limiter.limit(key);
	if (success) return { allowed: true, retryAfter: 0 };
	const retryAfter = Math.ceil((reset - Date.now()) / 1000);
	return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
}
