CREATE TYPE "public"."win_type" AS ENUM('single', 'shared_tie', 'tie_break');--> statement-breakpoint
CREATE TABLE "session_winner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"voting_option_id" uuid NOT NULL,
	"voting_session_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"winner_user_id" text,
	"win_type" "win_type",
	"vote_count" integer,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_winner" ADD CONSTRAINT "session_winner_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winner" ADD CONSTRAINT "session_winner_voting_option_id_voting_option_id_fk" FOREIGN KEY ("voting_option_id") REFERENCES "public"."voting_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winner" ADD CONSTRAINT "session_winner_voting_session_id_voting_session_id_fk" FOREIGN KEY ("voting_session_id") REFERENCES "public"."voting_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winner" ADD CONSTRAINT "session_winner_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winner" ADD CONSTRAINT "session_winner_winner_user_id_user_id_fk" FOREIGN KEY ("winner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_winner" ADD CONSTRAINT "session_winner_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_winner_voting_session_voting_option_winner_user_idx" ON "session_winner" USING btree ("voting_session_id","voting_option_id","winner_user_id") WHERE "session_winner"."winner_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "session_winner_voting_session_voting_option_idx" ON "session_winner" USING btree ("voting_option_id","voting_session_id") WHERE "session_winner"."winner_user_id" IS NULL;--> statement-breakpoint
CREATE INDEX "session_winner_community_id_idx" ON "session_winner" USING btree ("community_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "session_winner_user_id_idx" ON "session_winner" USING btree ("winner_user_id","created_at" DESC NULLS LAST) WHERE "session_winner"."winner_user_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_session" DROP COLUMN "start_date";