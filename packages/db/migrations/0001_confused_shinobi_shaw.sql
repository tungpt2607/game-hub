ALTER TYPE "public"."media_kind" ADD VALUE 'font';--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"module_version" text NOT NULL,
	"config" jsonb NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "brand_name" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "published_config" jsonb;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "published_module_version" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "published_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "published_revision" integer;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "published_by" uuid;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_template_version_idx" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;