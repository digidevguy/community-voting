import {
	createVotingSessionWithOptions,
	publishVotingSession
} from '$lib/server/voting/voting-session.service';
import { createVotingSessionSchema } from '$lib/server/voting/voting-session.validation';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { confirmUserInCommunity } from '$lib/server/communities/communities.service';
import {
	addGameToCollectionWithEnrichment,
	getCommunityCollection,
	getUserLibraryCollection,
	getUserLibraryGameIds
} from '$lib/server/collections/collection.service';
import * as Sentry from '@sentry/sveltekit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	const { communityId } = params;

	if (!communityId) {
		return error(400, { message: 'The matching community could not be found.' });
	}

	const isUserInCommunity = await confirmUserInCommunity(locals.db, locals.user.id, communityId);
	if (!isUserInCommunity) {
		return error(403, {
			message: 'You must be a member of this community to create a voting session.'
		});
	}

	const [collection, userCollection] = await Promise.all([
		getCommunityCollection(locals.db, communityId),
		getUserLibraryCollection(locals.db, locals.user.id)
	]);

	return {
		communityId,
		collection,
		userCollection
	};
};

async function parseCreateBody(body: FormData, communityId: string) {
	const gameIds = body.getAll('gameIds').map((id) => id.toString());

	const validationResult = createVotingSessionSchema.safeParse({
		title: body.get('title')?.toString() || '',
		description: body.get('description')?.toString() || undefined,
		votingSessionType: body.get('votingSessionType')?.toString() || undefined,
		gameDayDate: body.get('gameDayDate')?.toString() || '',
		showRealTimeResults: body.get('showRealTimeResults') === 'on',
		allowAddingOptions: body.get('allowAddingOptions') === 'on',
		communityId,
		gameIds
	});

	if (!validationResult.success) {
		return {
			error: fail(400, {
				success: false,
				message: validationResult.error.issues[0]?.message || 'Invalid voting session data.'
			})
		};
	}

	return { data: validationResult.data };
}

async function ensureSelectedGamesAreInCommunityCollection(
	db: App.Locals['db'],
	communityId: string,
	userId: string,
	selectedGameIds: string[]
) {
	if (selectedGameIds.length === 0) {
		return { success: true as const };
	}

	const communityCollection = await getCommunityCollection(db, communityId);
	const communityGameIds = new Set(communityCollection.map((item) => item.game.id));
	const missingGameIds = selectedGameIds.filter((id) => !communityGameIds.has(id));

	if (missingGameIds.length === 0) {
		return { success: true as const };
	}

	const userLibraryGameIds = await getUserLibraryGameIds(db, userId, missingGameIds);
	const userLibraryGameIdSet = new Set(userLibraryGameIds);
	const disallowedGameIds = missingGameIds.filter((id) => !userLibraryGameIdSet.has(id));

	if (disallowedGameIds.length > 0) {
		return {
			success: false as const,
			error: fail(400, {
				success: false,
				message: `You can only add games from the community collection or your synced library. Invalid games: ${disallowedGameIds.join(', ')}`
			})
		};
	}

	for (const gameId of missingGameIds) {
		try {
			await addGameToCollectionWithEnrichment(db, communityId, userId, gameId);
		} catch (error) {
			if (!(error instanceof Error) || error.message !== 'Game already exists in collection') {
				throw error;
			}
		}
	}

	return { success: true as const };
}

export const actions: Actions = {
	create: async ({ params, locals, request }) => {
		if (!locals.user) throw redirect(303, '/auth');
		const user = locals.user;
		const { communityId } = params;

		if (!communityId) return error(400, { message: 'The matching community could not be found.' });

		const isUserInCommunity = await confirmUserInCommunity(locals.db, user.id, communityId);
		if (!isUserInCommunity) {
			return error(403, {
				message: 'You must be a member of this community to create a voting session.'
			});
		}

		const parsed = await parseCreateBody(await request.formData(), communityId);
		if ('error' in parsed) return parsed.error;

		const communityCoverage = await ensureSelectedGamesAreInCommunityCollection(
			locals.db,
			communityId,
			locals.user.id,
			parsed.data.gameIds
		);

		if (!communityCoverage.success) return communityCoverage.error;

		try {
			const created = await createVotingSessionWithOptions(locals.db, parsed.data, user.id);
			Sentry.logger.info('Voting session created', {
				userId: locals.user.id,
				communityId,
				votingSessionId: created.id
			});
		} catch (err: unknown) {
			Sentry.captureException(err, {
				extra: {
					userId: locals.user.id,
					communityId
				}
			});
			return fail(500, {
				success: false,
				message: err instanceof Error ? err.message : 'An unexpected error occurred'
			});
		}
		return redirect(303, `/community/${communityId}`);
	},

	createAndPublish: async ({ params, locals, request }) => {
		if (!locals.user) throw redirect(303, '/auth');
		const user = locals.user;
		const { communityId } = params;

		if (!communityId) return error(400, { message: 'The matching community could not be found.' });

		const isUserInCommunity = await confirmUserInCommunity(locals.db, user.id, communityId);
		if (!isUserInCommunity) {
			return error(403, {
				message: 'You must be a member of this community to create a voting session.'
			});
		}

		const parsed = await parseCreateBody(await request.formData(), communityId);
		if ('error' in parsed) return parsed.error;

		const communityCoverage = await ensureSelectedGamesAreInCommunityCollection(
			locals.db,
			communityId,
			locals.user.id,
			parsed.data.gameIds
		);

		if (!communityCoverage.success) return communityCoverage.error;

		let session;
		try {
			session = await locals.db.transaction(async (tx) => {
				const created = await createVotingSessionWithOptions(tx, parsed.data, user.id);
				await publishVotingSession(locals.db, created.id, user.id);
				return created;
			});
			Sentry.logger.info('New voting session created and published', {
				createdby: user.id,
				communityId,
				sessionId: session.id
			});
		} catch (err: unknown) {
			Sentry.captureException(err, {
				extra: {
					userId: user.id,
					communityId
				}
			});
			return fail(500, {
				success: false,
				message: err instanceof Error ? err.message : 'An unexpected error occurred'
			});
		}
		return redirect(303, `/voting/${session.id}`);
	}
};
