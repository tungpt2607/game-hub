CREATE TABLE "game_module_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_key" text NOT NULL,
	"version" text NOT NULL,
	"files" jsonb NOT NULL,
	"schema_js" text NOT NULL,
	"runtime_js" text NOT NULL,
	"meta" jsonb NOT NULL,
	"notes" text,
	"published_by" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_modules" (
	"key" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"draft_files" jsonb,
	"draft_schema_js" text,
	"draft_runtime_js" text,
	"draft_meta" jsonb,
	"draft_updated_at" timestamp with time zone,
	"draft_updated_by" uuid,
	"latest_version" text,
	"builtin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "game_module_versions" ADD CONSTRAINT "game_module_versions_module_key_game_modules_key_fk" FOREIGN KEY ("module_key") REFERENCES "public"."game_modules"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_module_versions" ADD CONSTRAINT "game_module_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_modules" ADD CONSTRAINT "game_modules_draft_updated_by_users_id_fk" FOREIGN KEY ("draft_updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_module_versions_key_version_idx" ON "game_module_versions" USING btree ("module_key","version");