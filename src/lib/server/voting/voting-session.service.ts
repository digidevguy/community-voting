import type { Database, DBTransaction } from '$lib/server/db';
import { game, votingOption, votingSession, type VotingOption } from '$lib/server/db/schema';
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
			startDate: data.startDate,
			endDate: data.endDate,
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

export async function deleteVotinSession(
	db: Database | DBTransaction,
	sessionId: string,
	userId: string
) {}

export async function addGameToSession(
	db: Database | DBTransaction,
	data: CreateVotingOptionInput
) {
	// 1. Check if game exists as option
	const [{ id }] = await db.select({ id: game.id }).from(game).where(eq(game.id, data.gameId)); // TODO: If existingGame is empty, return the error message

	if (!id) {
		console.error('GameId not valid');
	} // 2. Check if already in session

	const [option] = await db
		.select()
		.from(votingOption)
		.where(
			and(
				eq(votingOption.gameId, data.gameId),
				eq(votingOption.votingSessionId, data.votingSessionId)
			)
		);

	if (option) return option; // 3. Add to voting_option table

	const newOption = await db.insert(votingOption).values(data); // TODO: if newOption is not a success, return the error message
	// 4. Return data

	return newOption; // TODO: Check if game is in community's collection, if it is not the add it.
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
