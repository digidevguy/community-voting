import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import {
	getUserVoteForSession,
	getVotingSessionWithResults
} from '$lib/server/voting/voting-session.service';
import { castVote } from '$lib/server/voting/voting-session.service';
import { createVoteSchema } from '$lib/server/voting/voting-session.validation';
import z from 'zod';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}
	const { votingSessionId } = params;

	if (!votingSessionId) {
		return error(500, 'Voting session not found');
	}

	return {
		session: await getVotingSessionWithResults(locals.db, votingSessionId),
		userVote: await getUserVoteForSession(locals.db, locals.user.id, votingSessionId)
	};
};

export const actions: Actions = {
	vote: async (e) => {
		const formData = await e.request.formData();
		const votingSessionId = formData.get('votingSessionId');
		const votingOptionId = formData.get('votingOptionId');
		const userId = e.locals.user?.id;

		if (!userId) {
			throw redirect(303, '/auth');
		}

		const validated = createVoteSchema.safeParse({ userId, votingSessionId, votingOptionId });
		if (!validated.success) {
			return {
				success: false,
				errors: z.treeifyError(validated.error)
			};
		}

		try {
			const result = await castVote(
				e.locals.db,
				validated.data.userId,
				validated.data.votingSessionId,
				validated.data.votingOptionId
			);

			return {
				success: true,
				voteId: result.id
			};
		} catch (err: unknown) {
			console.error('Err: ', err);
			return {
				success: false,
				errors: [err instanceof Error ? err.message : 'Failed to cast vote']
			};
		}
	}
};
