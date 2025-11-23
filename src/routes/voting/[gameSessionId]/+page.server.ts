import type { PageServerLoad } from './$types';
import type { Database } from '$lib/server/db';
import { game, votingOption, votingSession } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { gameSessionId } = params;
	const db: Database = locals.db;

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
		.filter((opt) => opt !== null);

	return { session, options };
};
