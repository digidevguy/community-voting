-- Add customization fields to invitations
ALTER TABLE "invitations" ADD COLUMN "label" text;
ALTER TABLE "invitations" ADD COLUMN "granted_role" "community_role";
ALTER TABLE "invitations" ADD COLUMN "membership_duration_days" integer;
--> statement-breakpoint
-- Add temporary membership support to community_user
ALTER TABLE "community_user" ADD COLUMN "membership_expires_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "community_user_membership_expires_at_idx" ON "community_user" ("membership_expires_at");
