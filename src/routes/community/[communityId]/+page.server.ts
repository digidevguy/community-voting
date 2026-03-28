import type { Actions, PageServerLoad } from './$types';
import {
	getCommunityInfo,
	confirmUserInCommunity,
	getUserCommunityRole
} from '$lib/server/communities/communities.service';
import { getCommunityCollectionCount } from '$lib/server/collections/collection.service';
import {
	getCommunitySessions,
	renewVotingSession
} from '$lib/server/voting/voting-session.service';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const userInCommunity = await confirmUserInCommunity(
		locals.db,
		locals.user.id,
		params.communityId
	);

	if (!userInCommunity) {
		throw error(403, 'You do not have access to this community');
	}

	const userId = locals.user.id;
	const { communityId } = params;

	const [community, allSessions, collectionCount, userRole] = await Promise.all([
		getCommunityInfo(locals.db, communityId),
		getCommunitySessions(locals.db, communityId, userId),
		getCommunityCollectionCount(locals.db, communityId),
		getUserCommunityRole(locals.db, userId, communityId)
	]);

	const isPrivileged = userRole === 'moderator' || userRole === 'admin';
	const sessions = allSessions.filter(
		(s) => s.status !== 'draft' || s.createdBy === userId || isPrivileged
	);

	return { community, sessions, collectionCount, userRole };
};

export const actions: Actions = {
	renew: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const { communityId } = params;

		const inCommunity = await confirmUserInCommunity(locals.db, locals.user.id, communityId);

		if (!inCommunity) {
			return fail(403, { message: 'You are not a member of this community.' });
		}

		const formData = await request.formData();
		const votingSessionId = formData.get('votingSessionId');

		if (votingSessionId === null || typeof votingSessionId !== 'string') {
			return fail(400, { message: 'Missing votingSessionId' });
		}

		let newSession;
		try {
			newSession = await renewVotingSession(locals.db, votingSessionId, locals.user.id);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to renew session';
			console.error(message);
			return fail(400, { message });
		}

		return redirect(303, `/voting/${newSession.id}/edit`);
	}
};
