import type { Database, DBTransaction } from '$lib/server/db';
import { communityCollections } from '../db/schema';
import type { CreateCommunityCollectionInput } from './collection.validation';

export async function addGameToCollection(
	db: Database | DBTransaction,
	data: CreateCommunityCollectionInput
) {
	const response = await db.insert(communityCollections).values(data).returning();

	return response;
}
