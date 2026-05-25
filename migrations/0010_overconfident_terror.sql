ALTER TABLE "voting_session_subscription" DROP CONSTRAINT "voting_session_subscription_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "voting_session_subscription" DROP CONSTRAINT "voting_session_subscription_voting_session_id_voting_session_id_fk";
--> statement-breakpoint
ALTER TABLE "voting_session_subscription" ADD CONSTRAINT "vss_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_session_subscription" ADD CONSTRAINT "vss_voting_session_id_fk" FOREIGN KEY ("voting_session_id") REFERENCES "public"."voting_session"("id") ON DELETE cascade ON UPDATE no action;