import { redirect, fail, error } from '@sveltejs/kit';
import { z } from 'zod';
import { del } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import {
	getCommunityInfo,
	getUserCommunityRole
} from '$lib/server/communities/communities.service';
import { updateCommunityInfo } from '$lib/server/communities/communities.service';
import { updateCommunitySchema } from '$lib/server/communities/communites.validation';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!locals.user) {
		return redirect(302, '/auth');
	}
	const { community, userRole } = await parent();

	if (userRole !== 'admin') {
		return error(403, { message: 'Unauthorized' });
	}

	return {
		community,
		userRole
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.user) {
			return redirect(302, '/auth');
		}

		const role = await getUserCommunityRole(locals.db, locals.user.id, params.communityId);
		if (role !== 'admin') {
			return fail(403, { message: 'Only admins are authorized' });
		}

		const formData = await request.formData();

		const raw = {
			title: formData.get('title')?.toString() || undefined,
			description: formData.get('description')?.toString() || undefined,
			headerImage: formData.get('headerImage')?.toString() || undefined
		};

		const parsed = updateCommunitySchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				message: parsed.error.issues[0].message,
				fieldErrors: z.treeifyError(parsed.error)
			});
		}

		const current = await getCommunityInfo(locals.db, params.communityId);

		try {
			await updateCommunityInfo(locals.db, parsed.data, params.communityId);
			if (parsed.data.headerImage && current.header_image) {
				await del(current.header_image, { token: env.BLOB_READ_WRITE_TOKEN });
			}

			return { success: true };
		} catch {
			return fail(500, { message: 'Failed to update community settings' });
		}
	}
};
