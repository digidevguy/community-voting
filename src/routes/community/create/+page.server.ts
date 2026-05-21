import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createCommunity,
	joinCommunity,
	getOwnedCommunitiesCount
} from '$lib/server/communities/communities.service';
import { createCommunitySchema } from '$lib/server/communities/communites.validation';
import * as Sentry from '@sentry/sveltekit';

const MAX_OWNED_COMMUNITIES = 3;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth');
	}

	const ownedCommunityCount = await getOwnedCommunitiesCount(locals.db, locals.user.id);

	if (ownedCommunityCount >= MAX_OWNED_COMMUNITIES) {
		throw redirect(302, '/community');
	}

	return;
};

async function parseCreateCommunityBody(body: FormData, userId: string) {
	const validationResult = await createCommunitySchema.safeParse({
		title: body.get('title')?.toString(),
		description: body.get('description')?.toString(),
		headerImage: body.get('headerImage')?.toString() || undefined,
		createdBy: userId
	});

	if (!validationResult.success) {
		return {
			error: fail(400, {
				success: false,
				message: validationResult.error.issues[0]?.message || 'Invalid community data.'
			})
		};
	}

	return { data: validationResult.data };
}

export const actions: Actions = {
	createCommunity: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(302, '/auth');
		}

		const ownedCommunityCount = await getOwnedCommunitiesCount(locals.db, locals.user.id);
		if (ownedCommunityCount >= MAX_OWNED_COMMUNITIES) {
			throw error(403, { message: 'You have reached the maximum number of owned communities.' });
		}

		const user = locals.user;
		const parsed = await parseCreateCommunityBody(await request.formData(), user.id);
		if ('error' in parsed) return parsed.error;

		let newCommunity;
		try {
			newCommunity = await locals.db.transaction(async (tx) => {
				const created = await createCommunity(tx, parsed.data);
				await joinCommunity(tx, {
					communityId: created.id,
					userId: user.id,
					role: 'admin'
				});
				return created;
			});
			Sentry.logger.info('New Community created', {
				userId: user.id,
				communityId: newCommunity.id
			});
		} catch (err: unknown) {
			Sentry.captureException(err, {
				extra: {
					userId: user.id
				}
			});
			return fail(500, {
				success: false,
				message: err instanceof Error ? err.message : 'An unexpected error occurred'
			});
		}

		redirect(303, `/community/${newCommunity.id}`);
	}
};
