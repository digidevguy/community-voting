import {
	confirmUserInCommunity,
	createCommunityInvite,
	getInvitesByCommunity,
	revokeInvite
} from '$lib/server/communities/communities.service';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createInviteSchema } from '$lib/server/communities/communites.validation';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(303, '/auth');
	}
	const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
	if (!isMember) {
		error(403, 'Forbidden');
	}

	return {
		invites: await getInvitesByCommunity(locals.db, params.communityId)
	};
};

export const actions: Actions = {
	create: async ({ locals, request, params }) => {
		if (!locals.user) {
			redirect(303, '/auth');
		}
		const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
		if (!isMember) {
			error(403, 'Forbidden');
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

			return { success: true, id: invite.id };
		} catch (error) {
			console.error('Error creating invite:', error instanceof Error ? error.message : error);
			return fail(500, { message: 'Failed to create invite!' });
		}
	},
	revoke: async ({ locals, request, params }) => {
		if (!locals.user) {
			redirect(303, '/auth');
		}
		const isMember = await confirmUserInCommunity(locals.db, locals.user.id, params.communityId);
		if (!isMember) {
			error(403, 'Forbidden');
		}

		const inviteId = (await request.formData()).get('inviteId')?.toString();
		if (!inviteId) return fail(400, { message: 'Missing invite ID' });

		try {
			await revokeInvite(locals.db, inviteId);
			return { success: true };
		} catch (error) {
			console.error('Error when revoking invite:', error instanceof Error ? error.message : error);
			return fail(500, { message: 'Failed to revoke invite!' });
		}
	}
};
