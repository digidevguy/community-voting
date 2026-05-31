import { z } from 'zod';

export const collectionGameActionSchema = z.object({
	gameId: z.uuid('Invalid game ID')
});

export const collectionSearchSchema = z.object({
	searchTerm: z
		.string()
		.min(2, 'Search query must be at least 2 characters')
		.max(100, 'Search query is too long')
		.trim()
});

export type CollectionGameActionInput = z.infer<typeof collectionGameActionSchema>;
export type CollectionSearchInput = z.infer<typeof collectionSearchSchema>;

export const createCommunityCollectionSchema = z.object({
	communityId: z.uuid(),
	gameId: z.uuid(),
	addedBy: z.uuid().optional(),
	addedAt: z.coerce
		.date()
		.max(new Date(), { message: 'addedAt cannot be in the future' })
		.optional(),
	isActive: z.boolean().default(true),
	removedBy: z.uuid().optional(),
	removedAt: z.date().optional()
});

export type CreateCommunityCollectionInput = z.infer<typeof createCommunityCollectionSchema>;
