// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { auth } from '$lib/server/auth';

type BetterAuthSession = typeof auth.$Infer.Session;

declare global {
	namespace App {
		interface Locals {
			user: BetterAuthSession['user'] | null;
			session: BetterAuthSession['session'] | null;
			db: typeof import('$lib/server/db').db;
		}
	}
}

export {};
