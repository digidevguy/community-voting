import { createVotingSession } from '$lib/server/voting/voting-session.service';
import { createVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { communityId, userId } = params;

	/**
	 * TODO: Bring forward after page is built.
	 * if (!locals.user) {
	 * 	return json({ error: 'unauthorized' }, { status: 401 });
	 * }
	 */

	const body = await request.json();

	const validated = createVotingSessionSchema.parse({ ...body, communityId });

	try {
		/**
		 * TODO: Bring in after userID refactor is in place
		 * const session = await createVotingSession(locals.db, validated, locals.user?.id);
		 */
		const session = await createVotingSession(locals.db, validated, userId);

		return json({
			status: 201,
			votingSession: session
		});
	} catch (err: unknown) {
		return json({
			status: 500,
			message: err instanceof Error ? err.message : 'An unexpected error occurred'
		});
	}
};
