CREATE TABLE "city" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "city_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_level_check" CHECK ("category"."level" IN (1, 2)),
	CONSTRAINT "category_parent_level_check" CHECK (("category"."level" = 1 AND "category"."parent_id" IS NULL) OR ("category"."level" = 2 AND "category"."parent_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "app_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_setting_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_city_level_sort_idx" ON "category" USING btree ("city_id","level","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "category_city_slug_idx" ON "category" USING btree ("city_id","slug");
--> statement-breakpoint
-- Seed: Atlanta city
INSERT INTO "city" ("id","name","slug","active","sort_order","created_at","updated_at")
VALUES ('city-atlanta','Atlanta','atlanta',true,0,now(),now())
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Seed: root categories for Atlanta
INSERT INTO "category" ("id","city_id","parent_id","name","slug","level","sort_order","active","created_at","updated_at") VALUES
  ('cat-atl-restaurants',    'city-atlanta',NULL,'Restaurants',           'restaurants',            1,0,true,now(),now()),
  ('cat-atl-education',      'city-atlanta',NULL,'Education',             'education',              1,1,true,now(),now()),
  ('cat-atl-events',         'city-atlanta',NULL,'Events & Entertainment','events-entertainment',   1,2,true,now(),now()),
  ('cat-atl-professional',   'city-atlanta',NULL,'Professional Services', 'professional-services',  1,3,true,now(),now()),
  ('cat-atl-health',         'city-atlanta',NULL,'Health & Wellness',     'health-wellness',        1,4,true,now(),now()),
  ('cat-atl-realestate',     'city-atlanta',NULL,'Real Estate',           'real-estate',            1,5,true,now(),now()),
  ('cat-atl-shopping',       'city-atlanta',NULL,'Shopping',              'shopping',               1,6,true,now(),now())
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Seed: homepage app settings
INSERT INTO "app_setting" ("id","key","value","updated_at") VALUES
  (gen_random_uuid(),'homepage_about_title','A directory of Atlanta''s Indian community, curated with care',now()),
  (gen_random_uuid(),'homepage_about_body', 'Every listing is reviewed by a person before it appears. Real businesses. Real people. The dosa place, the tabla teacher, the mandap rental — the people you''d ask a friend about.',now()),
  (gen_random_uuid(),'homepage_stat_businesses','auto',now()),
  (gen_random_uuid(),'homepage_stat_users',     'auto',now())
ON CONFLICT (key) DO NOTHING;