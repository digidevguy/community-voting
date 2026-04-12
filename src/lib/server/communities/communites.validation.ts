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

export const updateCommunitySchema = z
	.object({
		title: z.string().min(1, 'Title is required').optional(),
		description: z.string().min(50, 'Description must be at least 50 characters').optional(),
		headerImage: z.url('Must be a valid URL').optional()
	})
	.refine((data) => Object.values(data).some((v) => v !== undefined && v !== ''), {
		message: 'At least one field must be provided'
	});

export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;

export type CreateCommunityUserInput = z.infer<typeof createCommunityUserSchema>;

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
