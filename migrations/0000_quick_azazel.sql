CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."community_role" AS ENUM('member', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."game_type" AS ENUM('board_game', 'video_game');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('vote_stated', 'vote_ended', 'new_option_added', 'vote_reminder');--> statement-breakpoint
CREATE TYPE "public"."related_entity_type" AS ENUM('voting_session', 'game', 'user');--> statement-breakpoint
CREATE TYPE "public"."voting_session_status" AS ENUM('draft', 'active', 'voting_ended', 'completed', 'archived', 'cancelled');--> statement-breakpoint
CREATE TABLE "community" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"header_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "community_collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"added_by" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"removed_by" text,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "community_user" (
	"community_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "community_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_user_community_id_user_id_pk" PRIMARY KEY("community_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "game_type" NOT NULL,
	"description" text,
	"image" text,
	"min_players" integer,
	"max_players" integer,
	"playing_time" integer,
	"age_rating" text,
	"publisher" text,
	"developer" text,
	"release_date" timestamp,
	"categories" json,
	"genres" json,
	"mechanics" json,
	"bgg_id" integer,
	"steam_app_id" integer,
	"steam_store_url" text,
	"rating" real,
	"complexity" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_api_sync" timestamp,
	"api_data_complete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" "related_entity_type",
	"related_entity_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"age" integer,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"avatar" text,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"id" uuid PRIMARY KEY NOT NULL,
	"voting_option_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voting_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voting_session_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"added_by" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"adding_during_voting" boolean DEFAULT false NOT NULL,
	"approval_status" "approval_status" DEFAULT 'approved' NOT NULL,
	"reviewed_by" text
);
--> statement-breakpoint
CREATE TABLE "voting_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"status" "voting_session_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"show_real_time_results" boolean DEFAULT true NOT NULL,
	"allow_adding_options" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"selected_option_id" uuid
);
--> statement-breakpoint
ALTER TABLE "community" ADD CONSTRAINT "community_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_collection" ADD CONSTRAINT "community_collection_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_collection" ADD CONSTRAINT "community_collection_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_collection" ADD CONSTRAINT "community_collection_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_collection" ADD CONSTRAINT "community_collection_removed_by_user_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user" ADD CONSTRAINT "community_user_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_user" ADD CONSTRAINT "community_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_voting_option_id_voting_option_id_fk" FOREIGN KEY ("voting_option_id") REFERENCES "public"."voting_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_option" ADD CONSTRAINT "voting_option_voting_session_id_voting_session_id_fk" FOREIGN KEY ("voting_session_id") REFERENCES "public"."voting_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_option" ADD CONSTRAINT "voting_option_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_option" ADD CONSTRAINT "voting_option_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_option" ADD CONSTRAINT "voting_option_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_session" ADD CONSTRAINT "voting_session_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_session" ADD CONSTRAINT "voting_session_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_session" ADD CONSTRAINT "voting_session_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_created_by_idx" ON "community" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "community_game_idx" ON "community_collection" USING btree ("community_id","game_id");--> statement-breakpoint
CREATE INDEX "community_id_is_active_idx" ON "community_collection" USING btree ("community_id","is_active");--> statement-breakpoint
CREATE INDEX "community_collection_game_id_idx" ON "community_collection" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "community_collection_added_by_idx" ON "community_collection" USING btree ("added_by");--> statement-breakpoint
CREATE INDEX "community_user_user_id_idx" ON "community_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "community_role_idx" ON "community_user" USING btree ("community_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "game_bgg_id_idx" ON "game" USING btree ("bgg_id") WHERE "game"."bgg_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "game_steam_id_idx" ON "game" USING btree ("steam_app_id") WHERE "game"."steam_app_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "game_type_idx" ON "game" USING btree ("type");--> statement-breakpoint
CREATE INDEX "game_title_idx" ON "game" USING btree ("title");--> statement-breakpoint
CREATE INDEX "last_api_sync_idx" ON "game" USING btree ("last_api_sync");--> statement-breakpoint
CREATE INDEX "api_data_complete_idx" ON "game" USING btree ("api_data_complete");--> statement-breakpoint
CREATE INDEX "user_id_is_read_idx" ON "notification" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notification_created_at_idx" ON "notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "username_idx" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "voting_option_user_idx" ON "vote" USING btree ("voting_option_id","user_id");--> statement-breakpoint
CREATE INDEX "voting_option_id_idx" ON "vote" USING btree ("voting_option_id");--> statement-breakpoint
CREATE INDEX "vote_user_idx" ON "vote" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voting_session_game_idx" ON "voting_option" USING btree ("voting_session_id","game_id");--> statement-breakpoint
CREATE INDEX "voting_session_id_is_active_idx" ON "voting_option" USING btree ("voting_session_id","is_active");--> statement-breakpoint
CREATE INDEX "voting_option_game_id_idx" ON "voting_option" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "voting_option_added_by_idx" ON "voting_option" USING btree ("added_by");--> statement-breakpoint
CREATE INDEX "status_idx" ON "voting_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "voting_session_created_by_idx" ON "voting_session" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "voting_session_start_date_idx" ON "voting_session" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "voting_session_end_date_idx" ON "voting_session" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "community_status_idx" ON "voting_session" USING btree ("community_id","status");