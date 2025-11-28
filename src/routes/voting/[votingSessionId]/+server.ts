import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { castVote } from '$lib/server/voting/voting-session.service';

const VoteInput = z.object({
	votingOptionId: z.uuid()
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { votingSessionId } = params;

	if (!locals.user) {
		throw error(400, 'Not logged in.');
	}

	const body = await request.json();
	const validated = await VoteInput.parse({ ...body });

	try {
		const vote = await castVote(
			locals.db,
			locals.user.id,
			votingSessionId,
			validated.votingOptionId
		);
		return json({
			status: 200,
			message: 'Vote was created successfully.',
			voteId: vote.id
		});
	} catch (err: unknown) {
		return json({
			status: 500,
			message: err instanceof Error ? err.message : 'An unexpected error occurred'
		});
	}
};
