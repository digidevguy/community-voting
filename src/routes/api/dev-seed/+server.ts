import type { RequestHandler } from './$types.js';
import { hash } from '@node-rs/argon2';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { encodeBase32LowerCase } from '@oslojs/encoding';

export const POST: RequestHandler = async ({ request }) => {
	if (process.env.NODE_ENV !== 'development') {
		throw error(403, 'Not available in production');
	}

	const { email, displayName, password, username } = await request.json();

	if (!email || !username || !password || !displayName) {
		throw error(400, 'Missing required fields');
	}

	const userId = generateUserId();
	const passwordHash = await hash(password, {
		// recommended minimum parameters
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	try {
		await db.insert(table.user).values({ id: userId, email, displayName, passwordHash, username });

		return json({ success: true, userId });
	} catch (err) {
		console.log('Registration error:', err);
		throw error(500, 'Error creating user');
	}
};

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}
