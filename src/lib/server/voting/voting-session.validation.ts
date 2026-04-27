import { z } from 'zod';

const dateRefinement = (data: { gameDayDate: Date }, ctx: z.RefinementCtx) => {
	const now = Date.now();

	if (data.gameDayDate.getTime() < now) {
		ctx.addIssue({
			code: 'custom',
			path: ['gameDayDate'],
			message: 'Game day date/time cannot be in the past.'
		});
	}
};

const baseVotingSessionSchema = z.object({
	communityId: z.uuid(),
	title: z.string().min(1),
	description: z.string().optional(),
	votingSessionType: z.enum(['board_game', 'video_game', 'mixed']).default('video_game'),
	gameDayDate: z.coerce.date(),
	showRealTimeResults: z.boolean().default(true),
	allowAddingOptions: z.boolean().default(true),
	gameIds: z.array(z.uuid()).min(1)
});

export const createVotingSessionSchema = baseVotingSessionSchema.superRefine(dateRefinement);

export const updateVotingSessionSchema = baseVotingSessionSchema.extend({
	gameIds: z.array(z.uuid()).min(1).optional()
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

export const winnerLoggingSchema = z.object({
	votingSessionId: z.uuid(),
	winnerOptionIds: z.array(z.uuid()).min(1, { message: 'At least one winner is required.' }),
	loggedBy: z.uuid(),
	loggedAt: z.coerce.date()
});

export type CreateVotingSessionInput = z.infer<typeof createVotingSessionSchema>;

export type UpdateVotingSessionInput = z.infer<typeof updateVotingSessionSchema>;

export type CreateVotingOptionInput = z.infer<typeof createVotingOptionSchema>;

export type CreateVoteInput = z.infer<typeof createVoteSchema>;

export type CreateWinnerLoggingInput = z.infer<typeof winnerLoggingSchema>;
