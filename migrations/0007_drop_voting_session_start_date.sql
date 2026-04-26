DROP INDEX "voting_session_start_date_idx";--> statement-breakpoint
ALTER TABLE "voting_session" DROP COLUMN "start_date";
