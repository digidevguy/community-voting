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
	boolean
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

export const approvalStatus = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

export const notificationType = pgEnum('notification_type', [
	'vote_stated',
	'vote_ended',
	'new_option_added',
	'vote_reminder'
]);

export const relatedEntityType = pgEnum('related_entity_type', ['voting_session', 'game', 'user']);

// Auth and User Management

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		age: integer('age'),
		username: text('username').notNull().unique(),
		email: text('email').notNull().unique(),
		avatar: text('avatar'),
		displayName: text('display_name').notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('username_idx').on(table.username), index('email_idx').on(table.email)]
);

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('session_user_id_idx').on(table.userId),
		index('expires_at_idx').on(table.expiresAt)
	]
);

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
		createdBy: text('created_by').references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('community_created_by_idx').on(table.createdBy)]
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
		joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.communityId, table.userId] }),
		index('community_user_user_id_idx').on(table.userId),
		index('community_role_idx').on(table.communityId, table.role)
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
		createdBy: text('created_by')
			.notNull()
			.references(() => user.id, { onDelete: 'set null' }),
		status: votingSessionStatus('status').notNull().default('draft'),
		startDate: timestamp('start_date', { withTimezone: true }),
		endDate: timestamp('end_date', { withTimezone: true }),
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
		index('voting_session_start_date_idx').on(table.startDate),
		index('voting_session_end_date_idx').on(table.endDate),
		index('community_status_idx').on(table.communityId, table.status)
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
		id: uuid('id').primaryKey().notNull(),
		votingOptionId: uuid('voting_option_id')
			.notNull()
			.references(() => votingOption.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('voting_option_user_idx').on(table.votingOptionId, table.userId),
		index('voting_option_id_idx').on(table.votingOptionId),
		index('vote_user_idx').on(table.userId)
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
		index('notification_created_at_idx').on(table.createdAt)
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

export type CommunityCollection = typeof game.$inferSelect;

export type Notification = typeof notification.$inferSelect;
