import { z } from 'zod';

const userIdSchema = z.string().regex(/^[a-z2-7]{24}$/);

export const createCommunitySchema = z.object({
	title: z.string(),
	description: z.string().min(50),
	headerImage: z.url(),
	updatedAt: z.coerce.date().optional(),
	createdBy: userIdSchema
});

export const createCommunityUserSchema = z.object({
	communityId: z.uuid(),
	userId: userIdSchema,
	role: z.enum(['member', 'moderator', 'admin']).optional()
});

export const createInviteSchema = z.object({
	expiresAt: z.coerce.date().optional(),
	maxUses: z.coerce.number().int().positive().optional()
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export type CreateCommunityUserInput = z.infer<typeof createCommunityUserSchema>;

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
