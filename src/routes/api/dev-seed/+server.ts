import type { RequestHandler } from './$types.js';
import { hash } from '@node-rs/argon2';
import { error, json } from '@sveltejs/kit';
import { type DBTransaction } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { encodeBase32LowerCase } from '@oslojs/encoding';

export const POST: RequestHandler = async ({ locals, request }) => {
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
		/**Backup - Test user creation
		 * await db.insert(table.user).values({ id: userId, email, displayName, passwordHash, username });
		 */
		await locals.db.transaction(async (tx: DBTransaction) => {
			await tx
				.insert(table.user)
				.values({ id: userId, email, displayName, passwordHash, username });
			await tx.insert(table.community).values({
				title: 'The Singularity',
				description:
					'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
				header_image:
					'https://images.unsplash.com/photo-1584824486516-0555a07fc511?q=80&w=1770&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
				createdBy: userId
			});
		});

		return json({ success: true });
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
