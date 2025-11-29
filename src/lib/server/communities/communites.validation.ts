import { z } from 'zod';

export const createCommunitySchema = z.object({
	title: z.string(),
	description: z.string().min(50),
	headerImage: z.url(),
	updatedAt: z.coerce.date().optional(),
	createdBy: z.uuid()
});

export const createCommunityUserSchema = z.object({
	communityId: z.uuid(),
	userId: z.uuid(),
	role: z.enum(['member', 'moderator', 'admin']).optional()
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export type CreateCommunityUserInput = z.infer<typeof createCommunityUserSchema>;
