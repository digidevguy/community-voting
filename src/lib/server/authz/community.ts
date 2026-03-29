import { error, redirect } from '@sveltejs/kit';
import { getVotingSession } from '../voting/voting-session.service';
import { getUserCommunityRole } from '../communities/communities.service';

/**
 *  * This function is a reusable authz check for voting access to a community. It checks the following:
 * 1. If the user is authenticated
 * 2. If the voting session exists
 * 3. If the voting session is active (not expired)
 * 4. If the user is a member of the community that the voting session belongs to
 * @param locals
 * @param votingSessionId
 */
export async function requireVotingAccess(locals: App.Locals, votingSessionId: string) {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	const session = await getVotingSession(locals.db, votingSessionId);

	if (!session) {
		throw error(404, 'Voting session not found');
	}

	const role = await getUserCommunityRole(locals.db, locals.user.id, session.communityId);

	if (!role) {
		throw error(403, 'User is not a member of the community');
	}

	const isPrivileged =
		session.createdBy === locals.user.id || role === 'moderator' || role === 'admin';

	if (session.status === 'draft' && !isPrivileged) {
		throw error(403, 'This session is not yet published');
	}

	if (session.status === 'active' && session.gameDayDate && session.gameDayDate < new Date()) {
		throw error(403, 'Voting session has expired');
	}

	return session;
}

/**
 * Checks that the user can write (edit/delete) a voting session.
 * Allowed if the user is the session creator, or a community moderator/admin.
 */
export async function requireSessionWriteAccess(locals: App.Locals, votingSessionId: string) {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	const session = await getVotingSession(locals.db, votingSessionId);

	if (!session) {
		throw error(404, 'Voting session not found');
	}

	const userId = locals.user.id;

	if (session.createdBy === userId) {
		return session;
	}

	const role = await getUserCommunityRole(locals.db, userId, session.communityId);

	if (role !== 'moderator' && role !== 'admin') {
		throw error(
			403,
			'Only the session creator or a community moderator/admin can perform this action'
		);
	}

	return session;
}
