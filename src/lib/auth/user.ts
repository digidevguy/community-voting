// login/register helpers
import { hash } from '@node-rs/argon2';
import { encodeBase32LowerCase } from '@oslojs/encoding';
import * as table from '$lib/server/db/schema';
import type { Database, DBTransaction } from '$lib/server/db';

export function generateUserId(): string {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return encodeBase32LowerCase(bytes);
}

export interface CreateUserInput {
	username: string;
	email: string;
	displayName: string;
	password: string;
}

export async function createUser(db: Database | DBTransaction, data: CreateUserInput): Promise<string> {
	const userId = generateUserId();
	const passwordHash = await hash(data.password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	await db.insert(table.user).values({
		id: userId,
		username: data.username,
		email: data.email,
		displayName: data.displayName,
		passwordHash
	});

	return userId;
}
