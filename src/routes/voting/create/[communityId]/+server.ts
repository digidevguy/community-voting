import { createVotingSession } from '$lib/server/voting/voting-session.service';
import { createVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { communityId } = params;

	if (!locals.user) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	const body = await request.json();

	const validated = createVotingSessionSchema.parse({ ...body, communityId });

	try {
		const session = await createVotingSession(locals.db, validated, locals.user?.id);

		return {
			status: 201,
			votingSession: session
		};
	} catch (err: any) {
		return {
			status: 500,
			message: err.message
		};
	}
};
