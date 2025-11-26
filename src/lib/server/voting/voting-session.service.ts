import type { Database, DBTransaction } from '$lib/server/db';
import {
	communityCollections,
	game,
	vote,
	votingOption,
	votingSession
} from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type {
	CreateVotingOptionInput,
	CreateVotingSessionInput
} from './voting-session.validation';

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

export async function getVotingSession(db: Database, sessionId: string) {}

export async function updateVotingSession(
	db: Database | DBTransaction,
	sessionId: string,
	data: CreateVotingSessionInput,
	userId: string
) {}

export async function deleteVotingSession(
	db: Database | DBTransaction,
	sessionId: string,
	userId: string
) {}

export async function addGameToSession(
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

	const newOption = await db.insert(votingOption).values(data).returning();

	if (!newOption) {
		throw new Error('Failed to add game to session');
	}

	// TODO: Uncomment when community_collection logic is created
	// const [existingInCollection] = await db
	// 	.select()
	// 	.from(communityCollections)
	// 	.where(
	// 		and(
	// 			eq(communityCollections.communityId, session.communityId),
	// 			eq(communityCollections.gameId, data.gameId),
	// 			eq(communityCollections.isActive, true)
	// 		)
	// 	);

	// if (!existingInCollection) {
	// 	await db.insert(communityCollections).values({
	// 		communityId: session.communityId,
	// 		gameId: data.gameId,
	// 		addedBy: data.addedBy,
	// 		addedAt: new Date(),
	// 		isActive: true
	// 	});
	// }

	return newOption;
}

export async function removeGameFromSession(
	db: Database | DBTransaction,
	sessionId: string,
	gameId: string,
	userId: string
) {}

export async function publishVotingSession(
	db: Database | DBTransaction,
	sessionId: string,
	userId: string
) {
	// 1. Validate session has games
	// 2. Check user permissions
	// 3. Update status to 'active'
	// 4. Maybe send notifications
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
			target: vote.votingSessionId,
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

export async function getVotingSessionWithResults(db: Database | DBTransaction, sessionId: string) {
	// Join voting_session, voting_option, vote, game
	// Calculate vote counts
	// Return formatted results
}

export async function getCommunityActiveSessions(
	db: Database | DBTransaction,
	communityId: string
) {
	// Join
}
