ALTER TABLE "businesses" ADD COLUMN "city_id" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "business_type" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "years_operating" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;