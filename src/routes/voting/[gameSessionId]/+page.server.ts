import type { PageServerLoad } from './$types';
import type { Database } from '$lib/server/db';
import { votingSession } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { gameSessionId } = params;
	const db: Database = locals.db;

	const [session] = await db
		.select()
		.from(votingSession)
		.where(eq(votingSession.id, gameSessionId));

	if (!session) {
		throw error(404, 'Voting session not found');
	}

	return session;
};
