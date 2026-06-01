import {
	pgTable,
	index,
	integer,
	text,
	timestamp,
	pgEnum,
	real,
	json,
	uuid,
	uniqueIndex,
	primaryKey,
	boolean,
	check,
	foreignKey
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const gameType = pgEnum('game_type', ['board_game', 'video_game']);

export const communityRole = pgEnum('community_role', ['member', 'moderator', 'admin']);

export const votingSessionStatus = pgEnum('voting_session_status', [
	'draft',
	'active',
	'voting_ended',
	'completed',
	'archived',
	'cancelled'
]);
export const votingSessionType = pgEnum('voting_session_type', [
	'board_game',
	'video_game',
	'mixed'
]);

export const approvalStatus = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

export const notificationType = pgEnum('notification_type', [
	'vote_started',
	'vote_ended',
	'new_option_added',
	'vote_reminder',
	'app_update'
]);

export const relatedEntityType = pgEnum('related_entity_type', ['voting_session', 'game', 'user']);

export const invitationStatus = pgEnum('invitation_status', [
	'pending',
	'accepted',
	'expired',
	'revoked'
]);

export const winType = pgEnum('win_type', ['single', 'shared_tie', 'tie_break']);

// Auth and User Management

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	image: text('image'),
	name: text('name').notNull(),
	emailVerified: boolean('email_verified').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	steamId: text('steam_id').unique()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		updatedAt: timestamp('updated_at').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('session_user_id_idx').on(table.userId),
		index('expires_at_idx').on(table.expiresAt)
	]
);

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	idToken: text('id_token'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

// Core tables

export const community = pgTable(
	'community',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		description: text('description'),
		header_image: text('header_image'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'cascade' }),
		allowMembersCreateSessions: boolean('allow_members_create_sessions').notNull().default(true),
		allowMembersAddCollection: boolean('allow_members_add_collection').notNull().default(true)
	},
	(table) => [index('community_created_by_idx').on(table.createdBy)]
);

export const invitations = pgTable(
	'invitations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		communityId: uuid('community_id')
			.references(() => community.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		status: invitationStatus('status').notNull().default('pending'),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
		maxUses: integer('max_uses'),
		useCount: integer('use_count').notNull().default(0),
		label: text('label'),
		grantedRole: communityRole('granted_role'),
		membershipDurationDays: integer('membership_duration_days')
	},
	(table) => [index('invitations_expires_at_idx').on(table.expiresAt)]
);

export const invitationRedemptions = pgTable(
	'invitation_redemptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		invitationId: uuid('invitation_id')
			.references(() => invitations.id, { onDelete: 'cascade' })
			.notNull(),
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		redeemedAt: timestamp('redeemed_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.defaultNow()
	},
	(table) => [
		index('redemptions_invitation_id_idx').on(table.invitationId),
		uniqueIndex('redemptions_user_invite_idx').on(table.invitationId, table.userId)
	]
);

export const communityUser = pgTable(
	'community_user',
	{
		communityId: uuid('community_id')
			.references(() => community.id, { onDelete: 'cascade' })
			.notNull(),
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		role: communityRole('role').default('member').notNull(),
		joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
		notifyVoteStarted: boolean('notify_vote_started').notNull().default(false),
		notifyVoteEnded: boolean('notify_vote_ended').notNull().default(false),
		notifyVoteReminder: boolean('notify_vote_reminder').notNull().default(false),
		membershipExpiresAt: timestamp('membership_expires_at', { withTimezone: true })
	},
	(table) => [
		primaryKey({ columns: [table.communityId, table.userId] }),
		index('community_user_user_id_idx').on(table.userId),
		index('community_role_idx').on(table.communityId, table.role),
		index('community_user_membership_expires_at_idx').on(table.membershipExpiresAt)
	]
);

export const votingSession = pgTable(
	'voting_session',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		communityId: uuid('community_id')
			.notNull()
			.references(() => community.id),
		title: text('title').notNull(),
		description: text('description'),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		voting_session_type: votingSessionType('voting_session_type').notNull().default('video_game'),
		status: votingSessionStatus('status').notNull().default('draft'),
		gameDayDate: timestamp('game_day_date', { withTimezone: true }),
		showRealTimeResults: boolean('show_real_time_results').notNull().default(true),
		allowAddingOptions: boolean('allow_adding_options').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedBy: text('updated_by').references(() => user.id),
		selectedOptionId: uuid('selected_option_id')
	},
	(table) => [
		index('status_idx').on(table.status),
		index('voting_session_created_by_idx').on(table.createdBy),
		index('voting_session_game_day_date_idx').on(table.gameDayDate),
		index('community_status_idx').on(table.communityId, table.status),
		index('voting_session_community_selected_option_idx').on(
			table.communityId,
			table.selectedOptionId
		)
	]
);

export const votingOption = pgTable(
	'voting_option',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		votingSessionId: uuid('voting_session_id')
			.notNull()
			.references(() => votingSession.id, { onDelete: 'cascade' }),
		gameId: uuid('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'restrict' }),
		addedBy: text('added_by').references(() => user.id, { onDelete: 'set null' }),
		order: integer('order').notNull().default(0),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		addedDuringVoting: boolean('adding_during_voting').notNull().default(false),
		approvalStatus: approvalStatus('approval_status').default('approved').notNull(),
		reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' })
	},
	(table) => [
		uniqueIndex('voting_session_game_idx').on(table.votingSessionId, table.gameId),
		index('voting_session_id_is_active_idx').on(table.votingSessionId, table.isActive),
		index('voting_option_game_id_idx').on(table.gameId),
		index('voting_option_added_by_idx').on(table.addedBy)
	]
);

export const vote = pgTable(
	'vote',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		votingOptionId: uuid('voting_option_id')
			.notNull()
			.references(() => votingOption.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		votingSessionId: uuid('voting_session_id')
			.notNull()
			.references(() => votingSession.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('user_session_vote_idx').on(table.userId, table.votingSessionId),
		index('vote_voting_option_id_idx').on(table.votingOptionId),
		index('vote_voting_session_id_idx').on(table.votingSessionId),
		index('vote_session_option_idx').on(table.votingSessionId, table.votingOptionId)
	]
);

export const game = pgTable(
	'game',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		title: text('title').notNull(),
		type: gameType('type').notNull(),
		description: text('description'),
		image: text('image'),
		minPlayers: integer('min_players'),
		maxPlayers: integer('max_players'),
		playingTime: integer('playing_time'),
		ageRating: text('age_rating'),
		publisher: text('publisher'),
		developer: text('developer'),
		releaseDate: timestamp('release_date', { mode: 'date' }),
		categories: json('categories').$type<string[]>(),
		genres: json('genres').$type<string[]>(),
		mechanics: json('mechanics').$type<string[]>(),
		bggId: integer('bgg_id'),
		steamAppId: integer('steam_app_id'),
		steamStoreUrl: text('steam_store_url'),
		rating: real('rating'),
		complexity: real('complexity'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
		lastApiSync: timestamp('last_api_sync'),
		apiDataComplete: boolean('api_data_complete').notNull().default(false)
	},
	(table) => [
		uniqueIndex('game_bgg_id_idx')
			.on(table.bggId)
			.where(sql`${table.bggId} IS NOT NULL`),
		uniqueIndex('game_steam_id_idx')
			.on(table.steamAppId)
			.where(sql`${table.steamAppId} IS NOT NULL`),
		index('game_type_idx').on(table.type),
		index('game_title_idx').on(table.title),
		index('last_api_sync_idx').on(table.lastApiSync),
		index('api_data_complete_idx').on(table.apiDataComplete)
	]
);

export const communityCollections = pgTable(
	'community_collection',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		communityId: uuid('community_id')
			.notNull()
			.references(() => community.id, { onDelete: 'cascade' }),
		gameId: uuid('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'restrict' }),
		addedBy: text('added_by').references(() => user.id, { onDelete: 'set null' }),
		addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
		isActive: boolean('is_active').notNull().default(true),
		removedBy: text('removed_by').references(() => user.id, { onDelete: 'set null' }),
		removedAt: timestamp('removed_at', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('community_game_idx').on(table.communityId, table.gameId),
		index('community_id_is_active_idx').on(table.communityId, table.isActive),
		index('community_collection_game_id_idx').on(table.gameId),
		index('community_collection_added_by_idx').on(table.addedBy)
	]
);

export const notification = pgTable(
	'notification',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: notificationType('type').notNull(),
		title: text('title').notNull(),
		message: text('message').notNull(),
		relatedEntityType: relatedEntityType('related_entity_type'),
		relatedEntityId: text('related_entity_id'),
		isRead: boolean('is_read').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('user_id_is_read_idx').on(table.userId, table.isRead),
		index('notification_created_at_idx').on(table.createdAt),
		index('notification_type_created_at_idx').on(table.type, table.createdAt)
	]
);

export const pushSubscription = pgTable('push_subscription', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	endpoint: text('endpoint').notNull().unique(),
	p256dhKey: text('p256dh_key').notNull(),
	authKey: text('auth_key').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const userNotificationPreference = pgTable('user_notification_preference', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	notifyAppUpdates: boolean('notify_app_updates').notNull().default(false)
});

export const votingSessionSubscription = pgTable(
	'voting_session_subscription',
	{
		userId: text('user_id').notNull(),
		votingSessionId: uuid('voting_session_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.votingSessionId] }),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: 'vss_user_id_fk'
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.votingSessionId],
			foreignColumns: [votingSession.id],
			name: 'vss_voting_session_id_fk'
		}).onDelete('cascade')
	]
);

export const release = pgTable('release', {
	id: uuid('id').primaryKey().defaultRandom(),
	version: text('version').notNull().unique(),
	title: text('title').notNull(),
	publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
	notifiedAt: timestamp('notified_at', { withTimezone: true })
});

// Join userGameLibrary + communityUser for user collections
export const userGameLibrary = pgTable(
	'user_game_library',
	{
		id: uuid('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		gameId: uuid('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'cascade' }),
		addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
		lastSynced: timestamp('last_synced', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('user_game_library_user_game_idx').on(table.userId, table.gameId),
		index('user_game_library_user_id_idx').on(table.userId)
	]
);

export const sessionWinner = pgTable(
	'session_winner',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		communityId: uuid('community_id')
			.notNull()
			.references(() => community.id, { onDelete: 'cascade' }),
		votingOptionId: uuid('voting_option_id')
			.notNull()
			.references(() => votingOption.id, { onDelete: 'cascade' }),
		votingSessionId: uuid('voting_session_id')
			.notNull()
			.references(() => votingSession.id, { onDelete: 'cascade' }),
		gameId: uuid('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'cascade' }),
		winnerUserId: text('winner_user_id').references(() => user.id, { onDelete: 'set null' }),
		winType: winType('win_type'),
		voteCount: integer('vote_count'),
		resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'no action' }),
		resolvedAt: timestamp('resolved_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('session_winner_voting_session_voting_option_winner_user_idx')
			.on(table.votingSessionId, table.votingOptionId, table.winnerUserId)
			.where(sql`${table.winnerUserId} IS NOT NULL`),
		uniqueIndex('session_winner_voting_session_voting_option_idx')
			.on(table.votingOptionId, table.votingSessionId)
			.where(sql`${table.winnerUserId} IS NULL`),
		index('session_winner_community_id_idx').on(table.communityId, table.createdAt.desc()),
		index('session_winner_user_id_idx')
			.on(table.winnerUserId, table.createdAt.desc())
			.where(sql`${table.winnerUserId} IS NOT NULL`)
	]
);

// Aggregation tables
export const gameStatistics = pgTable(
	'game_statistics',
	{
		communityId: uuid('community_id')
			.notNull()
			.references(() => community.id, { onDelete: 'cascade' }),
		gameId: uuid('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'cascade' }),
		timesUsed: integer('times_used').notNull().default(0),
		timesWon: integer('times_won').notNull().default(0),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.communityId, table.gameId] }),
		index('game_statistics_game_id_idx').on(table.gameId),
		check('game_statistics_times_used_non_negative', sql`${table.timesUsed} >= 0`),
		check('game_statistics_times_won_non_negative', sql`${table.timesWon} >= 0`),
		check('game_statistics_times_won_lte_used', sql`${table.timesWon} <= ${table.timesUsed}`)
	]
);

// Relations
export const votingSessionRelations = relations(votingSession, ({ one, many }) => ({
	selectedOption: one(votingOption, {
		fields: [votingSession.selectedOptionId],
		references: [votingOption.id]
	}),
	options: many(votingOption)
}));

export const votingOptionRelations = relations(votingOption, ({ one }) => ({
	session: one(votingSession, {
		fields: [votingOption.votingSessionId],
		references: [votingSession.id]
	})
}));

//Types
export type User = typeof user.$inferSelect;

export type Session = typeof session.$inferSelect;

export type Community = typeof community.$inferSelect;

export type CommunityUser = typeof communityUser.$inferSelect;

export type VotingSession = typeof votingSession.$inferSelect;

export type VotingOption = typeof votingOption.$inferSelect;

export type Vote = typeof vote.$inferSelect;

export type Game = typeof game.$inferSelect;

export type CommunityCollection = typeof communityCollections.$inferSelect;

export type GameStatistics = typeof gameStatistics.$inferSelect;

export type Notification = typeof notification.$inferSelect;

export type SessionWinner = typeof sessionWinner.$inferSelect;

export type Release = typeof release.$inferSelect;
