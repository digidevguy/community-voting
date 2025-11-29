import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getVotingSessionWithResults } from '$lib/server/voting/voting-session.service';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { votingSessionId } = params;

	if (!votingSessionId) {
		return error(500, 'Voting session not found');
	}

	return await getVotingSessionWithResults(locals.db, votingSessionId);
};
