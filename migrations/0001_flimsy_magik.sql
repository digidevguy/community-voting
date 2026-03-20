CREATE TYPE "public"."voting_session_type" AS ENUM('board_game', 'video_game', 'mixed');--> statement-breakpoint
DROP INDEX "voting_option_user_idx";--> statement-breakpoint
DROP INDEX "voting_option_id_idx";--> statement-breakpoint
DROP INDEX "vote_user_idx";--> statement-breakpoint
DROP INDEX "voting_session_start_date_idx";--> statement-breakpoint
DROP INDEX "voting_session_end_date_idx";--> statement-breakpoint
ALTER TABLE "vote" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "voting_session" ALTER COLUMN "start_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "voting_session" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_session" ADD COLUMN "game_day_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "voting_session" ALTER COLUMN "game_day_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vote" ADD COLUMN "voting_session_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "voting_session" ADD COLUMN "voting_session_type" "voting_session_type" DEFAULT 'video_game' NOT NULL;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_voting_session_id_voting_session_id_fk" FOREIGN KEY ("voting_session_id") REFERENCES "public"."voting_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_session_vote_idx" ON "vote" USING btree ("user_id","voting_session_id");--> statement-breakpoint
CREATE INDEX "voting_session_game_day_date_idx" ON "voting_session" USING btree ("game_day_date");--> statement-breakpoint
ALTER TABLE "voting_session" DROP COLUMN "end_date";