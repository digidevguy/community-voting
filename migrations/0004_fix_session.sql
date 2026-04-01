-- Old sessions are incompatible with Better Auth - safe to clear
TRUNCATE TABLE "session";

-- Add the columns that failed due to existing null rows
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "token" text NOT NULL DEFAULT '';
ALTER TABLE "session" ALTER COLUMN "token" DROP DEFAULT;

ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "session" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Add the unique constraint that failed because token didn't exist yet
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");
