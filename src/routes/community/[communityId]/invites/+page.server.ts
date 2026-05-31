import {
	clearInactiveInvites,
	confirmUserInCommunity,
	createCommunityInvite,
	getInviteById,
	getInvitesByCommunity,
	getUserCommunityRole,
	isPrivilegedRole,
	revokeInvite
} from '$lib/server/communities/communities.service';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createInviteSchema } from '$lib/server/communities/communites.validation';
import * as Sentry from '@sentry/sveltekit';
import { checkRateLimit, inviteCreateLimiter } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}
	const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
	if (!isMember) {
		throw error(403, 'Forbidden');
	}

	return {
		communityId: params.communityId,
		invites: await getInvitesByCommunity(locals.db, params.communityId),
		role: await getUserCommunityRole(locals.db, locals.user.id, params.communityId)
	};
};

export const actions: Actions = {
	clear: async ({ locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}

		const communityId = params.communityId;
		const role = await getUserCommunityRole(locals.db, locals.user.id, communityId);

		if (!isPrivilegedRole(role)) {
			throw error(403, 'Forbidden');
		}

		try {
			await clearInactiveInvites(locals.db, communityId);
			return { success: true };
		} catch (err) {
			Sentry.captureException(err, {
				tags: { communityId, userId: locals.user.id }
			});
			return fail(500, { message: 'Failed to clear inactive invites' });
		}
	},
	create: async ({ locals, request, params }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}
		const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
		if (!isMember) {
			throw error(403, 'Forbidden');
		}

		const rateLimit = await checkRateLimit(
			inviteCreateLimiter,
			`${locals.user.id}:${params.communityId}`
		);
		if (!rateLimit.allowed) {
			return fail(429, {
				message: `Too many invites created. Try again in ${rateLimit.retryAfter} seconds.`
			});
		}

		const body = await request.formData();

		const validationResult = createInviteSchema.safeParse({
			expiresAt: body.get('expiresAt')?.toString() || undefined,
			maxUses: body.get('maxUses')?.toString() || undefined
		});

		if (!validationResult.success) {
			return fail(400, { message: validationResult.error.issues[0]?.message });
		}

		try {
			const { expiresAt, maxUses } = validationResult.data;
			const invite = await createCommunityInvite(
				locals.db,
				params.communityId,
				locals.user.id,
				expiresAt,
				maxUses
			);
			Sentry.logger.info('Invite created', {
				userId: locals.user.id,
				communityId: params.communityId,
				inviteId: invite.id,
				expiresAt: expiresAt ?? null,
				maxUses: maxUses ?? null
			});
			Sentry.metrics.count('invite.created', 1, {
				attributes: {
					communityId: params.communityId
				}
			});
			return { success: true, id: invite.id };
		} catch (err) {
			Sentry.captureException(err, {
				tags: { communityId: params.communityId, userId: locals.user.id }
			});
			return fail(500, { message: 'Failed to create invite!' });
		}
	},
	revoke: async ({ locals, request, params }) => {
		if (!locals.user) {
			throw redirect(303, '/auth');
		}
		const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
		if (!isMember) {
			throw error(403, 'Forbidden');
		}

		const inviteId = (await request.formData()).get('inviteId')?.toString();
		if (!inviteId) return fail(400, { message: 'Missing invite ID' });

		const invite = await getInviteById(locals.db, inviteId);
		if (!invite) return fail(404, { message: 'Invite not found' });

		const isCreator = invite.createdBy === locals.user.id;
		if (!isCreator) {
			const role = await getUserCommunityRole(locals.db, locals.user.id, params.communityId);
			if (!isPrivilegedRole(role)) {
				throw error(403, 'Forbidden');
			}
		}

		try {
			await revokeInvite(locals.db, inviteId);
			Sentry.logger.info('Invite revoked', {
				userId: locals.user.id,
				communityId: params.communityId,
				inviteId,
				ownInvite: isCreator
			});
			return { success: true };
		} catch (err) {
			Sentry.captureException(err, {
				tags: { communityId: params.communityId, userId: locals.user.id },
				extra: { inviteId }
			});
			return fail(500, { message: 'Failed to revoke invite!' });
		}
	}
};
