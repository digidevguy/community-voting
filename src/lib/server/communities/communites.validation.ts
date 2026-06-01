import { z } from 'zod';

const userIdSchema = z.string().min(1);

export const createCommunitySchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().min(50, 'Description must be at least 50 characters'),
	headerImage: z.url('Must be a valid URL').optional(),
	createdBy: userIdSchema
});

export const createCommunityUserSchema = z.object({
	communityId: z.uuid(),
	userId: userIdSchema,
	role: z.enum(['member', 'moderator', 'admin']).optional(),
	membershipExpiresAt: z.date().optional()
});

export const createInviteSchema = z.object({
	expiresAt: z.coerce.date().optional(),
	maxUses: z.coerce.number().int().positive().optional(),
	label: z.string().max(100).optional(),
	grantedRole: z.enum(['member', 'moderator']).optional(),
	membershipDurationDays: z.coerce.number().int().positive().optional()
});

export const updateInviteSchema = z.object({
	inviteId: z.uuid(),
	expiresAt: z.coerce.date().optional(),
	maxUses: z.coerce.number().int().positive().optional(),
	label: z.string().max(100).optional()
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

export const updateCommunityPermissionsSchema = z.object({
	allowMembersCreateSessions: z.boolean(),
	allowMembersAddCollection: z.boolean()
});

export type UpdateCommunityPermissionsInput = z.infer<typeof updateCommunityPermissionsSchema>;

export type CreateCommunityUserInput = z.infer<typeof createCommunityUserSchema>;

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type UpdateInviteInput = z.infer<typeof updateInviteSchema>;

export const manageUserActionSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	action: z.enum(['kick', 'set_moderator', 'set_member', 'set_admin'])
});

export const manageSessionActionSchema = z.object({
	sessionId: z.uuid('Invalid session ID'),
	action: z.enum(['edit', 'end_voting', 'delete'])
});

export const toggleNotificationPreferenceSchema = z.object({
	preference: z.enum(['notifyVoteStarted', 'notifyVoteEnded', 'notifyVoteReminder']),
	value: z.enum(['true', 'false']).transform((v) => v === 'true')
});

export type ManageUserActionInput = z.infer<typeof manageUserActionSchema>;
export type ManageSessionActionInput = z.infer<typeof manageSessionActionSchema>;
export type ToggleNotificationPreferenceInput = z.infer<typeof toggleNotificationPreferenceSchema>;
