CREATE TYPE "public"."community_post_status" AS ENUM('pending', 'approved', 'expired', 'rejected');--> statement-breakpoint
CREATE TABLE "community_post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"status" "community_post_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp,
	"rejected_reason" text,
	"interest_count" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_interest" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_post" ADD CONSTRAINT "community_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_interest" ADD CONSTRAINT "post_interest_post_id_community_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_interest" ADD CONSTRAINT "post_interest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_post_status_created_idx" ON "community_post" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "community_post_user_idx" ON "community_post" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_interest_uq" ON "post_interest" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "post_interest_post_idx" ON "post_interest" USING btree ("post_id","created_at");--> statement-breakpoint
INSERT INTO "app_setting" ("id", "key", "value") VALUES (gen_random_uuid()::text, 'posts_expiry_days', '30') ON CONFLICT ("key") DO NOTHING;