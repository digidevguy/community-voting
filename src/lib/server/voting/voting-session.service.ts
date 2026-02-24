import type { Database, DBTransaction } from '$lib/server/db';
import { game, user, vote, votingOption, votingSession } from '$lib/server/db/schema';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import type {
	CreateVotingOptionInput,
	CreateVotingSessionInput
} from './voting-session.validation';
import { isGameInCollection } from '../collections/collection.service';

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
			startDate: data.startDate || new Date(),
			gameDayDate: data.gameDayDate,
			showRealTimeResults: data.showRealTimeResults,
			allowAddingOptions: data.allowAddingOptions,
			status: 'draft',
			createdBy: userId
		})
		.returning();

	return session;
}

export async function getVotingSession(db: Database, votingSessionId: string) {
	const [result] = await db
		.select()
		.from(votingSession)
		.where(eq(votingSession.id, votingSessionId));

	return result;
}

export async function getVotingSessionWithOptions(db: Database, votingSessionId: string) {
	const session = await getVotingSession(db, votingSessionId);
	if (!session) {
		throw new Error('Voting session not found');
	}

	const options = await db
		.select()
		.from(votingOption)
		.where(and(eq(votingOption.votingSessionId, votingSessionId), eq(votingOption.isActive, true)));

	return { session, options };
}

export async function updateVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	data: CreateVotingSessionInput,
	userId: string
) {
	const [result] = await db
		.update(votingSession)
		.set({
			title: data.title,
			description: data.description,
			voting_session_type: data.votingSessionType,
			startDate: data.startDate || new Date(),
			gameDayDate: data.gameDayDate,
			showRealTimeResults: data.showRealTimeResults,
			allowAddingOptions: data.allowAddingOptions,
			updatedBy: userId
		})
		.where(and(eq(votingSession.id, votingSessionId), eq(votingSession.createdBy, userId)))
		.returning({ id: votingSession.id });

	return result;
}

export async function syncVotingSessionOptions(
	db: Database | DBTransaction,
	votingSessionId: string,
	gameIds: string[],
	userId: string
) {
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
	const toActivate = desiredGameIds
		.map((gameId) => existingByGameId.get(gameId))
		.filter((option): option is { id: string; gameId: string; isActive: boolean } =>
			Boolean(option && !option.isActive)
		)
		.map((option) => option.id);

	const desiredSet = new Set(desiredGameIds);
	const toDeactivate = existingOptions
		.filter((option) => option.isActive && !desiredSet.has(option.gameId))
		.map((option) => option.id);

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

	return {
		inserted: toInsert.length,
		activated: toActivate.length,
		deactivated: toDeactivate.length
	};
}

export async function deleteVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	userId: string
) {
	const [id] = await db
		.delete(votingSession)
		.where(and(eq(votingSession.id, votingSessionId), eq(votingSession.createdBy, userId)))
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

	return newOption;
}

export async function removeVotingOptionFromSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	votingOptionId: string,
	userId: string
) {
	const [id] = await db
		.update(votingOption)
		.set({ isActive: false, reviewedBy: userId })
		.where(eq(votingOption.id, votingOptionId))
		.returning({ id: votingOption.id });

	return id;
}

export async function publishVotingSession(
	db: Database | DBTransaction,
	votingSessionId: string,
	userId: string
) {
	// 1. Validate session has games
	const hasGames = await db
		.select()
		.from(votingOption)
		.where(eq(votingOption.votingSessionId, votingSessionId));

	if (!hasGames || hasGames.length === 0) {
		throw new Error('Cannot publish session without voting options');
	}

	// 2. Check if user is in community
	const [foundUser] = await db.select().from(user).where(eq(user.id, userId));

	if (!foundUser) {
		throw new Error('User not found');
	}

	// 3. Update status to 'active'
	const [updatedVotingSessionStatus] = await db
		.update(votingSession)
		.set({ status: 'active', updatedBy: userId })
		.where(eq(votingSession.id, votingSessionId))
		.returning({ status: votingSession.status });

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

export async function getVotingSessionWithResults(
	db: Database | DBTransaction,
	votingSessionId: string
) {
	// Join voting_session, voting_option, vote, game
	const results = await db
		.select()
		.from(votingSession)
		.where(eq(votingSession.id, votingSessionId))
		.leftJoin(votingOption, eq(votingOption.votingSessionId, votingSessionId))
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
			startDate: votingSession.startDate,
			gameDayDate: votingSession.gameDayDate,
			voting_session_type: votingSession.voting_session_type,
			showRealTimeResults: votingSession.showRealTimeResults,
			allowAddingOptions: votingSession.allowAddingOptions,
			selectedOptionId: votingSession.selectedOptionId,
			createdAt: votingSession.createdAt,
			updatedBy: votingSession.updatedBy,
			hasVoted: sql<boolean>`CASE WHEN ${vote.id} IS NOT NULL THEN true ELSE false END`
		})
		.from(votingSession)
		.leftJoin(vote, and(eq(vote.votingSessionId, votingSession.id), eq(vote.userId, userId)))
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
