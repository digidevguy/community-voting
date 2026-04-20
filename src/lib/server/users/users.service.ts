import type { Database, DBTransaction } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';

export async function getUserSteamId(
	db: Database | DBTransaction,
	userId: string
): Promise<string | null> {
	const [dbUser] = await db.select({ steamId: user.steamId }).from(user).where(eq(user.id, userId));

	return dbUser?.steamId ?? null;
}
