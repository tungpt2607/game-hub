ALTER TABLE "game_module_versions" ADD COLUMN "assets" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "game_modules" ADD COLUMN "draft_assets" jsonb;