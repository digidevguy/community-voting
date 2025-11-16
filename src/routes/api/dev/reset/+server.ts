import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	// 1. Check if in dev mode
	if (process.env.NODE_ENV !== 'development') {
		throw error(403, 'Not available in production');
	}

	try {
		// 2. Drop tables
		await locals.db.execut;
	} catch (err: unknown) {
		console.error('Reset error: ', err);
	}

	// 3. Handle errors gracefully

	// 4. Return a success response and http code
};
