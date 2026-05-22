import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { createAuthMiddleware } from 'better-auth/api';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import * as Sentry from '@sentry/sveltekit';

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	socialProviders: {
		discord: {
			clientId: env.DISCORD_CLIENT_ID,
			clientSecret: env.DISCORD_CLIENT_SECRET,
			mapProfileToUser: (profile) => ({
				name: profile.global_name ?? profile.username,
				image: profile.avatar
					? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
					: undefined
			})
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)],
	hooks: {
		// This creates an after event that triggers on the successful creation of a new user session. This will fire regardless of the method used to authenticate.
		after: createAuthMiddleware(async (ctx) => {
			const newSession = ctx.context.newSession;
			if (!newSession) return;

			Sentry.logger.info('User authenticated', {
				userId: newSession.user.id,
				sessionId: newSession.session.id
			});
		})
	}
});
