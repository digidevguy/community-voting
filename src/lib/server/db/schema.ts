import { pgTable, integer, text, timestamp, pgEnum, real, json } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
});

// Game type enum for 'board_game' | 'video_game'
export const gameType = pgEnum('game_type', ['board_game', 'video_game']);
export type ExternalIds = {
	steamId?: number;
	bggId?: number;
	steamUrl?: string;
};

export const game = pgTable('game', {
	id: text('id').primaryKey(),
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
	externalIds: json('external_ids').$type<ExternalIds>(),
	rating: real('rating'),
	complexity: real('complexity'),
	addedBy: text('added_by').references(() => user.id),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type Game = typeof game.$inferSelect;
