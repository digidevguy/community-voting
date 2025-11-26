import type { PageServerLoad } from './$types';
import type { Database } from '$lib/server/db';
import { game, vote, votingOption, votingSession } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { gameSessionId } = params;
	const db: Database = locals.db;

	if (!gameSessionId) {
		return error(500, 'Voting session not found');
	}

	const results = await db
		.select()
		.from(votingSession)
		.where(eq(votingSession.id, gameSessionId))
		.leftJoin(votingOption, eq(votingOption.votingSessionId, votingSession.id))
		.leftJoin(game, eq(votingOption.gameId, game.id));

	if (results.length === 0) {
		throw error(404, 'Voting session not found');
	}

	const session = results[0].voting_session;
	const options = results
		.map((r) => ({ ...r.voting_option, game: r.game }))
		.filter((opt) => opt.id !== null);

	const voteCounts = await db
		.select({ votingOptionId: vote.votingOptionId, count: count() })
		.from(vote)
		.where(eq(vote.votingSessionId, gameSessionId))
		.groupBy(vote.votingOptionId);

	const voteCountMap = new Map(
		voteCounts.filter((v) => v.votingOptionId !== null).map((v) => [v.votingOptionId!, v.count])
	);

	const optionsWithCounts = options.map((opt) => ({
		...opt,
		voteCount: opt.id ? (voteCountMap.get(opt.id) ?? 0) : 0
	}));

	return { session, options: optionsWithCounts };
};
