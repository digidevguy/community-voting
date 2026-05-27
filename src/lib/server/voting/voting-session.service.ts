import type { Database, DBTransaction } from '$lib/server/db';
import {
	communityUser,
	game,
	gameStatistics,
	user,
	vote,
	votingOption,
	votingSession
} from '$lib/server/db/schema';
import { and, count, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { tieBreakSchema } from './voting-session.validation';
import type {
	CreateVotingOptionInput,
	CreateVotingSessionInput,
	UpdateVotingSessionInput
} from './voting-session.validation';
import { BETTER_AUTH_URL } from '$env/static/private';
import { isGameInCollection } from '../collections/collection.service';
import { getUserCommunityRole, isPrivilegedRole } from '../communities/communities.service';
import { createNotificationForUsers } from '../notifications/notifications.service';
import { sendPushToUsers } from '../notifications/push.service';

async function getCommunityUserIdsForNotification(
	db: Database | DBTransaction,
	communityId: string,
	column: 'notifyVoteStarted' | 'notifyVoteEnded'
): Promise<string[]> {
	const rows = await db
		.select({ id: communityUser.userId })
		.from(communityUser)
		.where(and(eq(communityUser.communityId, communityId), eq(communityUser[column], true)));
	return rows.map((r) => r.id);
}

/**
 * Throws if `userId` is neither the session creator nor a privileged community member.
 * Accepts a minimal session shape to avoid redundant DB fetches.
 */
async function assertCanManageSession(
	db: Database | DBTransaction,
	userId: string,
	session: { createdBy: string | null; communityId: string }
) {
	if (session.createdBy === userId) return;
	const role = await getUserCommunityRole(db, userId, session.communityId);
	if (!isPrivilegedRole(role)) {
		throw new Error(
			'Only the session creator or a community moderator/admin can perform this action'
		);
	}
}

async function requireVotingSession(db: Database | DBTransaction, votingSessionId: string) {
	const session = await getVotingSession(db, votingSessionId);
	if (!session) {
		throw new Error('Voting session not found');
	}
	return session;
}

async function getActiveVotingOptions(db: Database | DBTransaction, votingSessionId: string) {
	return db
		.select()
		.from(votingOption)
		.where(and(eq(votingOption.votingSessionId, votingSessionId), eq(votingOption.isActive, true)));
}

async function resolveWinner(
	db: Database | DBTransaction,
	votingSessionId: string
): Promise<string | null> {
	const topOptions = await db
		.select({ votingOptionId: vote.votingOptionId, voteCount: count() })
		.from(vote)
		.where(eq(vote.votingSessionId, votingSessionId))
		.groupBy(vote.votingOptionId)
		.orderBy(desc(count()))
		.limit(2);

	const isTie = topOptions.length >= 2 && topOptions[0].voteCount === topOptions[1].voteCount;
	return topOptions.length > 0 && !isTie ? topOptions[0].votingOptionId : null;
}

async function refreshGameStatisticsForGame(
	db: Database | DBTransaction,
	communityId: string,
	gameId: string
) {
	const [usedResult] = await db
		.select({ count: count() })
		.from(votingOption)
		.innerJoin(votingSession, eq(votingOption.votingSessionId, votingSession.id))
		.where(and(eq(votingSession.communityId, communityId), eq(votingOption.gameId, gameId)));

	const [wonResult] = await db
		.select({ count: count() })
		.from(votingSession)
		.innerJoin(votingOption, eq(votingOption.id, votingSession.selectedOptionId))
		.where(and(eq(votingSession.communityId, communityId), eq(votingOption.gameId, gameId)));

	await db
		.insert(gameStatistics)
		.values({
			communityId,
			gameId,
			timesUsed: usedResult?.count ?? 0,
			timesWon: wonResult?.count ?? 0,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: [gameStatistics.communityId, gameStatistics.gameId],
			set: {
				timesUsed: usedResult?.count ?? 0,
				timesWon: wonResult?.count ?? 0,
				updatedAt: new Date()
			}
		});
}

async function refreshGameStatisticsForGames(
	db: Database | DBTransaction,
	communityId: string,
	gameIds: string[]
) {
	for (const gameId of new Set(gameIds)) {
		await refreshGameStatisticsForGame(db, communityId, gameId);
	}
}

async function refreshGameStatisticsForWinningOption(
	db: Database | DBTransaction,
	communityId: string,
	votingOptionId: string | null
) {
	if (!votingOptionId) {
		return;
	}

	const [winningOption] = await db
		.select({ gameId: votingOption.gameId })
		.from(votingOption)
		.where(eq(votingOption.id, votingOptionId));

	if (!winningOption) {
		return;
	}

	await refreshGameStatisticsForGames(db, communityId, [winningOption.gameId]);
}

export async function createVotingSession(
	db: Database | DBTransaction,
	data: CreateVotingSessionInput,
	userId: string
) {
	const [session] = await db
		.insert(votingSession)
		.values({
			title: data.title,
			communityId: data.communityId,
			description: data.description,
			voting_session_type: data.votingSessionType,
			gameDayDate: data.gameDayDate,
			showRealTimeResults: data.showRealTimeResults,
			allowAddingOptions: data.allowAddingOptions,
			status: 'draft',
			createdBy: userId
		})
		.returning();

	return session;
}

/**
 * Creates a voting session and its initial voting options atomically within a transaction.
 * `data.gameIds` must already be validated as belonging to the community collection.
 */
export async function createVotingSessionWithOptions(
	db: Database | DBTransaction,
	data: CreateVotingSessionInput,
	userId: string
) {
	return db.transaction(async (tx) => {
		const session = await createVotingSession(tx, data, userId);

		if (data.gameIds && data.gameIds.length > 0) {
			await tx.insert(votingOption).values(
				data.gameIds.map((gameId) => ({
					gameId,
					votingSessionId: session.id,
					addedBy: userId,
					addedDuringVoting: false,
					approvalStatus: 'approved' as const
				}))
			);

			await refreshGameStatisticsForGames(tx, session.communityId, data.gameIds);
		}

		return session;
	});
}

export async function getVotingSession(db: Database | DBTransaction, votingSessionId: string) {
	const [result] = await db
		.select()
		.from(votingSession)
		.where(eq(votingSession.id, votingSessionId));

	return result;
}

export async function getVotingSessionWithOptions(db: Database, votingSessionId: string) {
	const session = await requireVotingSession(db, votingSessionId);

	const options = await getActiveVotingOptions(db, votingSessionId);

	return { session, options };
}

export async function getVotingSessionParticipants(db: Database, votingSessionId: string) {
	try {
		const results = await db
			.select({ id: user.id, name: user.name, image: user.image })
			.from(vote)
			.where(eq(vote.votingSessionId, votingSessionId))
			.innerJoin(user, eq(user.id, vote.userId));

		return results;
	} catch (error) {
		throw new Error(
			`Failed to get voting session users: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

export async function updateVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	data: UpdateVotingSessionInput,
	userId: string
) {
	const [result] = await db
		.update(votingSession)
		.set({
			title: data.title,
			description: data.description,
			voting_session_type: data.votingSessionType,
			gameDayDate: data.gameDayDate,
			showRealTimeResults: data.showRealTimeResults,
			allowAddingOptions: data.allowAddingOptions,
			updatedBy: userId
		})
		.where(eq(votingSession.id, votingSessionId))
		.returning({ id: votingSession.id });

	return result;
}

export async function syncVotingSessionOptions(
	db: Database | DBTransaction,
	votingSessionId: string,
	gameIds: string[],
	userId: string
) {
	const session = await requireVotingSession(db, votingSessionId);
	const desiredGameIds = [...new Set(gameIds)];

	const existingOptions = await db
		.select({
			id: votingOption.id,
			gameId: votingOption.gameId,
			isActive: votingOption.isActive
		})
		.from(votingOption)
		.where(eq(votingOption.votingSessionId, votingSessionId));

	const existingByGameId = new Map(existingOptions.map((option) => [option.gameId, option]));

	const toInsert = desiredGameIds.filter((gameId) => !existingByGameId.has(gameId));
	const toActivateOptions = desiredGameIds
		.map((gameId) => existingByGameId.get(gameId))
		.filter((option): option is { id: string; gameId: string; isActive: boolean } =>
			Boolean(option && !option.isActive)
		);
	const toActivate = toActivateOptions.map((option) => option.id);

	const desiredSet = new Set(desiredGameIds);
	const toDeactivateOptions = existingOptions
		.filter((option) => option.isActive && !desiredSet.has(option.gameId))
		.map((option) => ({ id: option.id, gameId: option.gameId }));
	const toDeactivate = toDeactivateOptions.map((option) => option.id);

	if (toInsert.length > 0) {
		const rows = toInsert.map((gameId, index) => ({
			votingSessionId,
			gameId,
			addedBy: userId,
			order: index,
			addedDuringVoting: false,
			approvalStatus: 'approved' as const
		}));

		await db.insert(votingOption).values(rows).onConflictDoNothing();
	}

	if (toActivate.length > 0) {
		await db
			.update(votingOption)
			.set({ isActive: true, reviewedBy: userId })
			.where(
				and(eq(votingOption.votingSessionId, votingSessionId), inArray(votingOption.id, toActivate))
			);
	}

	if (toDeactivate.length > 0) {
		await db
			.update(votingOption)
			.set({ isActive: false, reviewedBy: userId })
			.where(
				and(
					eq(votingOption.votingSessionId, votingSessionId),
					inArray(votingOption.id, toDeactivate)
				)
			);
	}

	const affectedGameIds = [
		...toInsert,
		...toActivateOptions.map((option) => option.gameId),
		...toDeactivateOptions.map((option) => option.gameId)
	];

	if (affectedGameIds.length > 0) {
		await refreshGameStatisticsForGames(db, session.communityId, affectedGameIds);
	}

	return {
		inserted: toInsert.length,
		activated: toActivate.length,
		deactivated: toDeactivate.length
	};
}

export async function deleteVotingSession(db: Database | DBTransaction, votingSessionId: string) {
	const [id] = await db
		.delete(votingSession)
		.where(eq(votingSession.id, votingSessionId))
		.returning({ id: votingSession.id });

	return id;
}

export async function addVotingOptionToSession(
	db: Database | DBTransaction,
	data: CreateVotingOptionInput
) {
	// 1. Check if game exists as option
	const [existingGame] = await db
		.select({ id: game.id })
		.from(game)
		.where(eq(game.id, data.gameId));

	if (!existingGame) {
		throw new Error(`Game with id ${data.gameId} does not exist`);
	}

	const [session] = await db
		.select({
			id: votingSession.id,
			communityId: votingSession.communityId,
			createdBy: votingSession.createdBy,
			status: votingSession.status
		})
		.from(votingSession)
		.where(eq(votingSession.id, data.votingSessionId));

	if (!session) {
		throw new Error(`Voting session with id ${data.votingSessionId} does not exist.`);
	}

	if (session.status !== 'draft' && session.status !== 'active') {
		throw new Error('Unable to add games to a session that is not in draft or active.');
	}

	const gameInCollection = await isGameInCollection(db, session.communityId, data.gameId);

	if (!gameInCollection) {
		throw new Error('Game is not in the community collection');
	}

	const [existingOption] = await db
		.select()
		.from(votingOption)
		.where(
			and(
				eq(votingOption.gameId, data.gameId),
				eq(votingOption.votingSessionId, data.votingSessionId)
			)
		);

	if (existingOption) return existingOption; // 3. Add to voting_option table

	const [newOption] = await db.insert(votingOption).values(data).returning();

	if (!newOption) {
		throw new Error('Failed to add game to session');
	}

	await refreshGameStatisticsForGames(db, session.communityId, [newOption.gameId]);

	return newOption;
}

export async function removeVotingOptionFromSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	votingOptionId: string,
	userId: string
) {
	const session = await requireVotingSession(db, votingSessionId);

	const [removedOption] = await db
		.update(votingOption)
		.set({ isActive: false, reviewedBy: userId })
		.where(
			and(eq(votingOption.id, votingOptionId), eq(votingOption.votingSessionId, votingSessionId))
		)
		.returning({ id: votingOption.id, gameId: votingOption.gameId });

	if (removedOption) {
		await refreshGameStatisticsForGames(db, session.communityId, [removedOption.gameId]);
	}

	return removedOption;
}

export async function publishVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	userId: string
) {
	const existingSession = await requireVotingSession(db, votingSessionId);

	if (existingSession.status !== 'draft') {
		throw new Error('Only draft sessions can be published');
	}

	// Only the session creator, or a community moderator/admin, may publish
	await assertCanManageSession(db, userId, existingSession);

	// Validate session has active games
	const hasGames = await getActiveVotingOptions(db, votingSessionId);

	if (!hasGames || hasGames.length === 0) {
		throw new Error('Cannot publish session without voting options');
	}

	const [updatedVotingSessionStatus] = await db
		.update(votingSession)
		.set({ status: 'active', updatedBy: userId })
		.where(eq(votingSession.id, votingSessionId))
		.returning({ status: votingSession.status });

	const userIds = await getCommunityUserIdsForNotification(
		db,
		existingSession.communityId,
		'notifyVoteStarted'
	);

	if (userIds.length > 0) {
		await createNotificationForUsers(db, userIds, {
			type: 'vote_started',
			title: 'New voting session started!',
			message: existingSession.title,
			relatedEntityType: 'voting_session',
			relatedEntityId: votingSessionId
		});

		await sendPushToUsers(db, userIds, {
			title: 'New voting session started!',
			body: existingSession.title,
			url: `${BETTER_AUTH_URL}/voting/${votingSessionId}`
		});
	}

	return updatedVotingSessionStatus;
}

export async function castVote(
	db: Database | DBTransaction,
	userId: string,
	votingSessionId: string,
	votingOptionId: string
) {
	const [option] = await db
		.select()
		.from(votingOption)
		.where(
			and(eq(votingOption.votingSessionId, votingSessionId), eq(votingOption.id, votingOptionId))
		);

	if (!option) {
		throw new Error('Invalid voting option for this session');
	}

	const [result] = await db
		.insert(vote)
		.values({ userId, votingOptionId, votingSessionId })
		.onConflictDoUpdate({
			target: [vote.userId, vote.votingSessionId],
			set: { votingOptionId, updatedAt: new Date() }
		})
		.returning();

	return result;
}

export async function removeVoteByOption(
	db: Database | DBTransaction,
	userId: string,
	votingOptionId: string
) {
	const [deleted] = await db
		.delete(vote)
		.where(and(eq(vote.userId, userId), eq(vote.votingOptionId, votingOptionId)))
		.returning();

	return deleted;
}

export async function clearVoteForSession(
	db: Database | DBTransaction,
	userId: string,
	votingSessionId: string
) {
	await db
		.delete(vote)
		.where(and(eq(vote.userId, userId), eq(vote.votingSessionId, votingSessionId)));
}

export async function getVotingSessionWithResults(
	db: Database | DBTransaction,
	votingSessionId: string
) {
	// Join voting_session, voting_option, vote, game
	const results = await db
		.select()
		.from(votingSession)
		.where(eq(votingSession.id, votingSessionId))
		.leftJoin(
			votingOption,
			and(eq(votingOption.votingSessionId, votingSessionId), eq(votingOption.isActive, true))
		)
		.leftJoin(game, eq(votingOption.gameId, game.id));

	if (results.length === 0) {
		throw new Error('Voting session not found');
	}

	const votingSessionDetails = results[0].voting_session;
	const options = results
		.map((r) => ({ ...r.voting_option, game: r.game }))
		.filter((opt) => opt.id !== null);

	// Calculate vote counts
	const voteCounts = await db
		.select({ votingOptionId: vote.votingOptionId, count: count() })
		.from(vote)
		.where(eq(vote.votingSessionId, votingSessionId))
		.groupBy(vote.votingOptionId);

	const voteCountMap = new Map(
		voteCounts.filter((v) => v.votingOptionId !== null).map((v) => [v.votingOptionId!, v.count])
	);

	const optionsWithCounts = options.map((opt) => ({
		...opt,
		voteCount: opt.id ? (voteCountMap.get(opt.id) ?? 0) : 0
	}));

	// Return formatted results
	return { votingSessionDetails, options: optionsWithCounts };
}

export async function getCommunitySessions(
	db: Database | DBTransaction,
	communityId: string,
	userId: string
) {
	// Join community and voting_sessions, check if user has voted
	const results = await db
		.select({
			id: votingSession.id,
			communityId: votingSession.communityId,
			title: votingSession.title,
			description: votingSession.description,
			createdBy: votingSession.createdBy,
			status: votingSession.status,
			gameDayDate: votingSession.gameDayDate,
			voting_session_type: votingSession.voting_session_type,
			showRealTimeResults: votingSession.showRealTimeResults,
			allowAddingOptions: votingSession.allowAddingOptions,
			selectedOptionId: votingSession.selectedOptionId,
			createdAt: votingSession.createdAt,
			updatedBy: votingSession.updatedBy,
			hasVoted: sql<boolean>`CASE WHEN ${vote.id} IS NOT NULL THEN true ELSE false END`,
			totalVotes: sql<number>`(SELECT COUNT(*)::int FROM ${vote} WHERE ${vote.votingSessionId} = ${votingSession.id})`,
			selectedGameId: game.id,
			selectedGameTitle: game.title
		})
		.from(votingSession)
		.leftJoin(vote, and(eq(vote.votingSessionId, votingSession.id), eq(vote.userId, userId)))
		.leftJoin(votingOption, eq(votingOption.id, votingSession.selectedOptionId))
		.leftJoin(game, eq(game.id, votingOption.gameId))
		.where(eq(votingSession.communityId, communityId))
		.orderBy(votingSession.status);

	return results;
}

export async function getUserVoteForSession(
	db: Database | DBTransaction,
	userId: string,
	votingSessionId: string
) {
	const [userVote] = await db
		.select()
		.from(vote)
		.where(and(eq(vote.userId, userId), eq(vote.votingSessionId, votingSessionId)));

	if (!userVote) {
		return null;
	}

	return userVote;
}

/**
 * Covers closing an active voting session to `voting_ended` when its gameDayDate has passed.
 * Safe to call repeatedly — only updates if status is still `active`.
 */
export async function closeExpiredVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string
) {
	const [updated] = await db
		.update(votingSession)
		.set({ status: 'voting_ended' })
		.where(and(eq(votingSession.id, votingSessionId), eq(votingSession.status, 'active')))
		.returning({ id: votingSession.id, status: votingSession.status });

	return updated ?? null;
}

/**
 * Creates a new draft session by copying an existing session's metadata and active voting options.
 * The caller must be the original session's creator.
 */
export async function renewVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	userId: string
) {
	const original = await requireVotingSession(db, votingSessionId);

	await assertCanManageSession(db, userId, original);

	const [newSession] = await db
		.insert(votingSession)
		.values({
			communityId: original.communityId,
			title: original.title,
			description: original.description,
			voting_session_type: original.voting_session_type,
			showRealTimeResults: original.showRealTimeResults,
			allowAddingOptions: original.allowAddingOptions,
			gameDayDate: null,
			status: 'draft',
			createdBy: userId
		})
		.returning();

	const originalOptions = await getActiveVotingOptions(db, votingSessionId);

	if (originalOptions.length > 0) {
		await db.insert(votingOption).values(
			originalOptions.map((opt) => ({
				votingSessionId: newSession.id,
				gameId: opt.gameId,
				addedBy: userId,
				order: opt.order,
				addedDuringVoting: false,
				approvalStatus: 'approved' as const
			}))
		);

		await refreshGameStatisticsForGames(
			db,
			original.communityId,
			originalOptions.map((option) => option.gameId)
		);
	}

	return newSession;
}

/**
 * Finds all `active` voting sessions whose `gameDayDate` has passed and, for each, transitions them to `voting_ended` then immediately to `completed` with the winning option set.
 * Safe to call on a schedule — sessions already past `active` are skipped.
 * Returns a summary of how many sessions were processed.
 */
export async function finalizeExpiredSessions(db: Database) {
	const now = new Date();

	const expiredSessions = await db
		.select({ id: votingSession.id })
		.from(votingSession)
		.where(and(eq(votingSession.status, 'active'), lt(votingSession.gameDayDate, now)));

	let finalized = 0;

	for (const { id } of expiredSessions) {
		await db.transaction(async (tx) => {
			// Transition active → voting_ended
			await tx
				.update(votingSession)
				.set({ status: 'voting_ended' })
				.where(and(eq(votingSession.id, id), eq(votingSession.status, 'active')));

			const selectedOptionId = await resolveWinner(tx, id);

			// Transition voting_ended → completed
			if (selectedOptionId) {
				await tx
					.update(votingSession)
					.set({
						status: 'completed',
						selectedOptionId
					})
					.where(and(eq(votingSession.id, id), eq(votingSession.status, 'voting_ended')));

				const completedSession = await requireVotingSession(tx, id);
				await refreshGameStatisticsForWinningOption(
					tx,
					completedSession.communityId,
					selectedOptionId
				);
			}
		});

		finalized++;
	}

	return { finalized, total: expiredSessions.length };
}

/**
 * Selects the winning option (highest vote count) and marks the session as `completed`.
 * Only callable when status is `voting_ended`. Only the session creator may call this.
 * Throws if the result is a tie — use `assignTieBreakWinner` instead.
 */
export async function endVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	userId: string
) {
	const session = await requireVotingSession(db, votingSessionId);

	if (session.status !== 'voting_ended') {
		throw new Error('Voting session is not in voting_ended state');
	}

	await assertCanManageSession(db, userId, session);

	const selectedOptionId = await resolveWinner(db, votingSessionId);

	if (!selectedOptionId) {
		throw new Error(
			'The vote result is a tie. Use assignTieBreakWinner to manually select the winning option.'
		);
	}

	const [updated] = await db
		.update(votingSession)
		.set({
			status: 'completed',
			selectedOptionId,
			updatedBy: userId
		})
		.where(eq(votingSession.id, votingSessionId))
		.returning();

	await refreshGameStatisticsForWinningOption(db, session.communityId, selectedOptionId);

	return updated;
}
/**
 * Manually selects a winning option for a tied `voting_ended` session and transitions it to `completed`.
 * Only callable when the session is in `voting_ended` state and has no current winner (i.e. it is a tie).
 * Only the session creator or a privileged community member may call this.
 */
export async function assignTieBreakWinner(
	db: Database | DBTransaction,
	votingSessionId: string,
	votingOptionId: string,
	userId: string
) {
	const parseResult = tieBreakSchema.safeParse({ votingSessionId, votingOptionId });
	if (!parseResult.success) {
		throw new Error(parseResult.error.issues[0]?.message ?? 'Invalid tie-break input');
	}

	const session = await requireVotingSession(db, votingSessionId);

	if (session.status !== 'voting_ended') {
		throw new Error('Tie-break can only be applied to sessions in voting_ended state');
	}

	if (session.selectedOptionId !== null) {
		throw new Error(
			'This session already has a winning option. Use endVotingSession for sessions with a clear winner.'
		);
	}

	await assertCanManageSession(db, userId, session);

	const [option] = await db
		.select({ id: votingOption.id })
		.from(votingOption)
		.where(
			and(eq(votingOption.id, votingOptionId), eq(votingOption.votingSessionId, votingSessionId))
		);

	if (!option) {
		throw new Error('The specified option does not belong to this voting session');
	}

	const [updated] = await db
		.update(votingSession)
		.set({
			status: 'completed',
			selectedOptionId: votingOptionId,
			updatedBy: userId
		})
		.where(eq(votingSession.id, votingSessionId))
		.returning();

	await refreshGameStatisticsForWinningOption(db, session.communityId, votingOptionId);

	return updated;
}
