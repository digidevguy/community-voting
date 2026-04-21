CREATE TABLE "user_game_library" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "steam_id" text;--> statement-breakpoint
ALTER TABLE "user_game_library" ADD CONSTRAINT "user_game_library_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_library" ADD CONSTRAINT "user_game_library_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_game_library_user_game_idx" ON "user_game_library" USING btree ("user_id","game_id");--> statement-breakpoint
CREATE INDEX "user_game_library_user_id_idx" ON "user_game_library" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_steam_id_unique" UNIQUE("steam_id");
