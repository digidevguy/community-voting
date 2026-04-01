import { browser } from '$app/environment';
import { createAuthClient } from 'better-auth/svelte';

// Only create the auth client in the browser to prevent eager
// fetch calls during server-side rendering.
export const authClient = browser
	? createAuthClient()
	: ({} as ReturnType<typeof createAuthClient>);

export const { signIn, signOut, useSession } = authClient;
