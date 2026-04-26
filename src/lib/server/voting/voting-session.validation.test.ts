import { describe, it, expect } from 'vitest';
import { createVotingSessionSchema } from './voting-session.validation';

// Helper: a future date N days from now
function future(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

const validPayload = () => ({
	communityId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
	title: 'Game Night',
	gameDayDate: future(7),
	gameIds: ['f47ac10b-58cc-4372-a567-0e02b2c3d480']
});

describe('createVotingSessionSchema', () => {
	it('accepts a valid minimal payload', () => {
		const result = createVotingSessionSchema.safeParse(validPayload());
		expect(result.success).toBe(true);
	});

	it('applies default values for optional fields', () => {
		const result = createVotingSessionSchema.safeParse(validPayload());
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.votingSessionType).toBe('video_game');
		expect(result.data.showRealTimeResults).toBe(true);
		expect(result.data.allowAddingOptions).toBe(true);
	});

	it('rejects when title is empty', () => {
		const result = createVotingSessionSchema.safeParse({ ...validPayload(), title: '' });
		expect(result.success).toBe(false);
	});

	it('rejects when gameIds is empty', () => {
		const result = createVotingSessionSchema.safeParse({ ...validPayload(), gameIds: [] });
		expect(result.success).toBe(false);
	});

	it('rejects when communityId is not a valid UUID', () => {
		const result = createVotingSessionSchema.safeParse({
			...validPayload(),
			communityId: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
	});

	it('rejects when gameDayDate is in the past', () => {
		const result = createVotingSessionSchema.safeParse({
			...validPayload(),
			gameDayDate: new Date('2020-01-01')
		});
		expect(result.success).toBe(false);
		if (result.success) return;
		const paths = result.error.issues.map((i) => i.path[0]);
		expect(paths).toContain('gameDayDate');
	});

	it('accepts all valid votingSessionType values', () => {
		for (const type of ['board_game', 'video_game', 'mixed'] as const) {
			const result = createVotingSessionSchema.safeParse({
				...validPayload(),
				votingSessionType: type
			});
			expect(result.success).toBe(true);
		}
	});

	it('rejects an invalid votingSessionType', () => {
		const result = createVotingSessionSchema.safeParse({
			...validPayload(),
			votingSessionType: 'card_game'
		});
		expect(result.success).toBe(false);
	});
});
