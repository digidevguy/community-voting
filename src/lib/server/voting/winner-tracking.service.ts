import type { Database, DBTransaction } from '$lib/server/db';
import { communityUser, game, sessionWinner, user, votingSession } from '$lib/server/db/schema';
import { and, asc, count, desc, eq, isNotNull, lt, max, sql } from 'drizzle-orm';

type LeaderboardOptions = {
	limit: number;
	gamesPage: number;
	usersPage: number;
	recentPage: number;
	range?: string;
};

type UnresolvedCompletedSessionsOptions = {
	olderThanHours?: number;
};

export async function getSessionWinners(db: Database, votingSessionId: string) {
	return db
		.select({
			id: sessionWinner.winnerUserId,
			name: user.name,
			image: user.image
		})
		.from(sessionWinner)
		.leftJoin(user, eq(user.id, sessionWinner.winnerUserId))
		.where(eq(sessionWinner.votingSessionId, votingSessionId));
}

export async function getCommunityLeaderboard(
	db: Database,
	communityId: string,
	options: LeaderboardOptions
) {
	const { limit, gamesPage, usersPage, recentPage } = options;

	const gameWinCount = count().as('winCount');
	const gameLastWin = max(sessionWinner.resolvedAt).as('lastWin');

	const topGames = await db
		.select({
			gameId: sessionWinner.gameId,
			title: game.title,
			image: game.image,
			winCount: gameWinCount,
			lastWin: gameLastWin
		})
		.from(sessionWinner)
		.leftJoin(game, eq(sessionWinner.gameId, game.id))
		.where(eq(sessionWinner.communityId, communityId))
		.groupBy(sessionWinner.gameId, game.title, game.image)
		.orderBy(desc(gameWinCount), desc(gameLastWin), asc(sessionWinner.gameId))
		.limit(limit)
		.offset((gamesPage - 1) * limit);

	const userWinCount = count().as('winCount');
	const userLastWin = max(sessionWinner.resolvedAt).as('lastWin');

	const topUsers = await db
		.select({
			userId: sessionWinner.winnerUserId,
			name: user.name,
			image: user.image,
			winCount: userWinCount,
			lastWin: userLastWin
		})
		.from(sessionWinner)
		.innerJoin(
			communityUser,
			and(
				eq(communityUser.communityId, sessionWinner.communityId),
				eq(communityUser.userId, sessionWinner.winnerUserId)
			)
		)
		.leftJoin(user, eq(user.id, sessionWinner.winnerUserId))
		.where(and(eq(sessionWinner.communityId, communityId), isNotNull(sessionWinner.winnerUserId)))
		.groupBy(sessionWinner.winnerUserId, user.name, user.image)
		.orderBy(desc(userWinCount), desc(userLastWin), asc(sessionWinner.winnerUserId))
		.limit(limit)
		.offset((usersPage - 1) * limit);

	const recentWins = await db
		.select({
			winnerUserId: sessionWinner.winnerUserId,
			userName: user.name,
			userImage: user.image,
			gameId: sessionWinner.gameId,
			gameTitle: game.title,
			gameImage: game.image,
			resolvedAt: sessionWinner.resolvedAt
		})
		.from(sessionWinner)
		.innerJoin(
			communityUser,
			and(
				eq(communityUser.communityId, sessionWinner.communityId),
				eq(communityUser.userId, sessionWinner.winnerUserId)
			)
		)
		.leftJoin(user, eq(user.id, sessionWinner.winnerUserId))
		.leftJoin(game, eq(game.id, sessionWinner.gameId))
		.where(and(eq(sessionWinner.communityId, communityId), isNotNull(sessionWinner.winnerUserId)))
		.orderBy(desc(sessionWinner.resolvedAt))
		.limit(limit)
		.offset((recentPage - 1) * limit);

	return { topGames, topUsers, recentWins };
}

export async function getUnresolvedCompletedSessions(
	db: Database,
	communityId: string,
	options: UnresolvedCompletedSessionsOptions
) {
	const { olderThanHours } = options || {};

	const whereClauses = [
		eq(votingSession.communityId, communityId),
		eq(votingSession.status, 'completed')
	];

	// Age filter
	if (olderThanHours && typeof olderThanHours === 'number') {
		const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
		whereClauses.push(lt(votingSession.createdAt, cutoff));
	}

	// Query sessions with zero non-null winner rows
	// Use raw SQL for HAVING COUNT(session_winner.winner_user_id) FILTER (WHERE session_winner.winner_user_id IS NOT NULL) = 0
	return db
		.select({
			sessionId: votingSession.id,
			title: votingSession.title,
			createdAt: votingSession.createdAt
		})
		.from(votingSession)
		.leftJoin(sessionWinner, eq(sessionWinner.votingSessionId, votingSession.id))
		.where(and(...whereClauses))
		.groupBy(votingSession.id)
		.having(
			sql`COUNT(session_winner.winner_user_id) FILTER (WHERE session_winner.winner_user_id IS NOT NULL) = 0`
		);
}

import { winnerLoggingSchema, type CreateWinnerLoggingInput } from './voting-session.validation';

export async function setSessionWinners(
	db: Database | DBTransaction,
	input: CreateWinnerLoggingInput
) {
	// Validate input using winnerLoggingSchema (runtime safety)
	const parseResult = winnerLoggingSchema.safeParse(input);
	if (!parseResult.success) {
		return { success: false, error: parseResult.error };
	}
	const {
		votingSessionId,
		votingOptionId,
		communityId,
		gameId,
		voteCount,
		winnerUserIds,
		winType,
		resolvedBy
	} = input;

	try {
		await db.transaction(async (tx) => {
			await tx.delete(sessionWinner).where(eq(sessionWinner.votingSessionId, votingSessionId));

			await tx.insert(sessionWinner).values(
				winnerUserIds.map((userId) => ({
					votingSessionId,
					votingOptionId,
					communityId,
					gameId,
					winnerUserId: userId,
					voteCount,
					winType,
					resolvedBy,
					resolvedAt: new Date()
				}))
			);
		});
		return { success: true };
	} catch (error) {
		console.error('Failed to set session winners:', error);
		return { success: false, error };
	}
}
