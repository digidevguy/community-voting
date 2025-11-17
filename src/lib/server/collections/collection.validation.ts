import { z } from 'zod';

export const createCommunityCollectionSchema = z.object({
	communityId: z.uuid(),
	gameId: z.uuid(),
	addedBy: z.uuid().optional(),
	addedAt: z.coerce.date().max(new Date(), { message: 'addedAt cannot be in the future' }),
	isActive: z.boolean().default(true),
	removedBy: z.uuid().optional(),
	removedAt: z.date().optional()
});

export type CreateCommunityCollectionInput = z.infer<typeof createCommunityCollectionSchema>;
