import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';

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
	plugins: [sveltekitCookies(getRequestEvent)]
});
