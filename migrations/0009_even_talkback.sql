ALTER TYPE "public"."notification_type" ADD VALUE 'app_update';--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "user_notification_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"notify_app_updates" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voting_session_subscription" (
	"user_id" text NOT NULL,
	"voting_session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voting_session_subscription_user_id_voting_session_id_pk" PRIMARY KEY("user_id","voting_session_id")
);
--> statement-breakpoint
ALTER TABLE "community_user" ADD COLUMN "notify_vote_started" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "community_user" ADD COLUMN "notify_vote_ended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "community_user" ADD COLUMN "notify_vote_reminder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD CONSTRAINT "user_notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_session_subscription" ADD CONSTRAINT "voting_session_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voting_session_subscription" ADD CONSTRAINT "voting_session_subscription_voting_session_id_voting_session_id_fk" FOREIGN KEY ("voting_session_id") REFERENCES "public"."voting_session"("id") ON DELETE cascade ON UPDATE no action;