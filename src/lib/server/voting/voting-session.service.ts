import type { Database, DBTransaction } from '$lib/server/db';
import { votingSession } from '../db/schema';
import type { CreateVotingSessionInput } from './voting-session.validation';

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
	sessionId: string,
	data,
	userId: string
) {
	// 1. Check if game exists
	// 2. Check if already in session
	// 3. Add to voting_option table
	// 4. Add to community_collection if first time
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
