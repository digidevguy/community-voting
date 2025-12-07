import { z } from 'zod';

export const createVotingSessionSchema = z.object({
	communityId: z.uuid(),
	title: z.string().min(1),
	description: z.string().optional(),
	startDate: z.coerce.date().optional(),
	votingSessionType: z.enum(['board_game', 'video_game', 'mixed']).default('video_game'),
	gameDayDate: z.coerce.date(),
	showRealTimeResults: z.boolean().default(true),
	allowAddingOptions: z.boolean().default(true),
	gameIds: z.array(z.uuid()).optional()
});

export const createVotingOptionSchema = z.object({
	gameId: z.uuid(),
	votingSessionId: z.uuid(),
	addedBy: z.uuid(),
	order: z.number(),
	addedDuringVoting: z.boolean(),
	approvalStatus: z.enum(['pending', 'approved', 'rejected'])
});

export const createVoteSchema = z.object({
	userId: z.string(),
	votingSessionId: z.uuid(),
	votingOptionId: z.uuid()
});

export type CreateVotingSessionInput = z.infer<typeof createVotingSessionSchema>;

export type CreateVotingOptionInput = z.infer<typeof createVotingOptionSchema>;

export type CreateVoteInput = z.infer<typeof createVoteSchema>;
