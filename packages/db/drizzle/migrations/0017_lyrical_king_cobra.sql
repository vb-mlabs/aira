CREATE TABLE "business_category" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_image" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_category" ADD CONSTRAINT "business_category_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_category" ADD CONSTRAINT "business_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_image" ADD CONSTRAINT "business_image_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bc_business_category_idx" ON "business_category" USING btree ("business_id","category_id");--> statement-breakpoint
CREATE INDEX "bc_business_idx" ON "business_category" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bc_category_idx" ON "business_category" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bi_sort_idx" ON "business_image" USING btree ("business_id","sort_order");--> statement-breakpoint
CREATE INDEX "bi_business_idx" ON "business_image" USING btree ("business_id");