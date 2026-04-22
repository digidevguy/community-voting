CREATE TABLE "game_statistics" (
	"community_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"times_used" integer DEFAULT 0 NOT NULL,
	"times_won" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_statistics_community_id_game_id_pk" PRIMARY KEY("community_id","game_id"),
	CONSTRAINT "game_statistics_times_used_non_negative" CHECK ("game_statistics"."times_used" >= 0),
	CONSTRAINT "game_statistics_times_won_non_negative" CHECK ("game_statistics"."times_won" >= 0),
	CONSTRAINT "game_statistics_times_won_lte_used" CHECK ("game_statistics"."times_won" <= "game_statistics"."times_used")
);
--> statement-breakpoint
ALTER TABLE "game_statistics" ADD CONSTRAINT "game_statistics_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_statistics" ADD CONSTRAINT "game_statistics_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_statistics_game_id_idx" ON "game_statistics" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "vote_voting_option_id_idx" ON "vote" USING btree ("voting_option_id");--> statement-breakpoint
CREATE INDEX "vote_voting_session_id_idx" ON "vote" USING btree ("voting_session_id");--> statement-breakpoint
CREATE INDEX "vote_session_option_idx" ON "vote" USING btree ("voting_session_id","voting_option_id");--> statement-breakpoint
CREATE INDEX "voting_session_community_selected_option_idx" ON "voting_session" USING btree ("community_id","selected_option_id");--> statement-breakpoint
WITH used_counts AS (
	SELECT
		vs."community_id",
		vo."game_id",
		COUNT(*)::integer AS times_used
	FROM "voting_option" vo
	INNER JOIN "voting_session" vs ON vs."id" = vo."voting_session_id"
	GROUP BY vs."community_id", vo."game_id"
),
won_counts AS (
	SELECT
		vs."community_id",
		vo."game_id",
		COUNT(*)::integer AS times_won
	FROM "voting_session" vs
	INNER JOIN "voting_option" vo ON vo."id" = vs."selected_option_id"
	GROUP BY vs."community_id", vo."game_id"
)
INSERT INTO "game_statistics" (
	"community_id",
	"game_id",
	"times_used",
	"times_won",
	"updated_at"
)
SELECT
	cc."community_id",
	cc."game_id",
	COALESCE(uc.times_used, 0),
	COALESCE(wc.times_won, 0),
	now()
FROM "community_collection" cc
LEFT JOIN used_counts uc
	ON uc."community_id" = cc."community_id"
	AND uc."game_id" = cc."game_id"
LEFT JOIN won_counts wc
	ON wc."community_id" = cc."community_id"
	AND wc."game_id" = cc."game_id"
ON CONFLICT ("community_id", "game_id") DO UPDATE
SET
	"times_used" = EXCLUDED."times_used",
	"times_won" = EXCLUDED."times_won",
	"updated_at" = EXCLUDED."updated_at";