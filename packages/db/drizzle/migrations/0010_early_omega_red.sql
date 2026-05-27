CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"phone" text,
	"website" text,
	"address" text,
	"image_url" text,
	"tier" text DEFAULT 'tier3' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "businesses_category_tier_idx" ON "businesses" USING btree ("category","tier");--> statement-breakpoint
CREATE INDEX "businesses_tier_idx" ON "businesses" USING btree ("tier");