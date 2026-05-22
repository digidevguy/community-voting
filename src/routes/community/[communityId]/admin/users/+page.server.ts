import { communityUser, user, vote, votingSession } from '$lib/server/db/schema';
import { and, countDistinct, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import {
	getCommunityInfo,
	getUserCommunityRole,
	leaveCommunity,
	updateCommunityUserRole
} from '$lib/server/communities/communities.service';
import type { Actions, PageServerLoad } from './$types';
import * as Sentry from '@sentry/sveltekit';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { community, userRole } = await parent();

	const members = await locals.db
		.select({
			userId: communityUser.userId,
			name: user.name,
			role: communityUser.role,
			joinedAt: communityUser.joinedAt,
			sessionCount: countDistinct(vote.votingSessionId)
		})
		.from(communityUser)
		.innerJoin(user, eq(user.id, communityUser.userId))
		.leftJoin(votingSession, eq(votingSession.communityId, communityUser.communityId))
		.leftJoin(
			vote,
			and(eq(vote.userId, communityUser.userId), eq(vote.votingSessionId, votingSession.id))
		)
		.where(eq(communityUser.communityId, community.id))
		.groupBy(communityUser.userId, communityUser.role, communityUser.joinedAt, user.name);

	return { members, userRole, community, currentUserId: locals.user!.id };
};

export const actions: Actions = {
	manageUser: async ({ request, locals, params }) => {
		if (!locals.user) return redirect(302, '/auth');

		const formData = await request.formData();
		const targetUserId = formData.get('userId');
		const action = formData.get('action');

		if (typeof targetUserId !== 'string' || typeof action !== 'string') {
			return fail(400, { message: 'Invalid request' });
		}

		if (targetUserId === locals.user.id) {
			return fail(400, { message: 'Cannot perform this action on yourself' });
		}

		const communityId = params.communityId;

		let actorRole, targetRole, communityInfo;
		try {
			[actorRole, targetRole, communityInfo] = await Promise.all([
				getUserCommunityRole(locals.db, locals.user.id, communityId),
				getUserCommunityRole(locals.db, targetUserId, communityId),
				getCommunityInfo(locals.db, communityId)
			]);
		} catch {
			return fail(500, { message: 'Failed to verify permissions' });
		}

		const isActorOwner = communityInfo.createdBy === locals.user.id;

		switch (action) {
			case 'kick': {
				if (!isActorOwner) {
					if (actorRole === 'moderator' && targetRole !== 'member') {
						return fail(403, { message: 'Moderators can only remove members' });
					}
					if (actorRole === 'admin' && targetRole === 'admin') {
						return fail(403, { message: 'Admins cannot remove other admins' });
					}
				}
				try {
					await leaveCommunity(locals.db, communityId, targetUserId);
					Sentry.logger.info('User kicked from community', {
						actorUserId: locals.user.id,
						targetUserId,
						communityId,
						targetRole
					});
				} catch {
					return fail(500, { message: 'Failed to remove user' });
				}
				break;
			}
			case 'set_moderator': {
				if (!isActorOwner && actorRole !== 'admin') {
					return fail(403, { message: 'Only admins and the owner can change roles' });
				}
				try {
					await updateCommunityUserRole(locals.db, communityId, targetUserId, 'moderator');
					Sentry.logger.info('Community user role changed', {
						actorUserId: locals.user.id,
						targetUserId,
						communityId,
						previousRole: targetRole,
						newRole: 'moderator'
					});
				} catch {
					return fail(500, { message: 'Failed to update role' });
				}
				break;
			}
			case 'set_member': {
				if (!isActorOwner && actorRole !== 'admin') {
					return fail(403, { message: 'Only admins and the owner can change roles' });
				}
				try {
					await updateCommunityUserRole(locals.db, communityId, targetUserId, 'member');
					Sentry.logger.info('Community user role changed', {
						actorUserId: locals.user.id,
						targetUserId,
						communityId,
						previousRole: targetRole,
						newRole: 'member'
					});
				} catch {
					return fail(500, { message: 'Failed to update role' });
				}
				break;
			}
			case 'set_admin': {
				if (!isActorOwner) {
					return fail(403, { message: 'Only the owner can grant admin permissions' });
				}
				try {
					await updateCommunityUserRole(locals.db, communityId, targetUserId, 'admin');
					Sentry.logger.info('Community user role changed', {
						actorUserId: locals.user.id,
						targetUserId,
						communityId,
						previousRole: targetRole,
						newRole: 'admin'
					});
				} catch {
					return fail(500, { message: 'Failed to update role' });
				}
				break;
			}
			default:
				return fail(400, { message: 'Invalid action' });
		}

		return { success: true };
	}
};
