CREATE TYPE "public"."payment_status" AS ENUM('paid', 'pending', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."sponsorship_status" AS ENUM('scheduled', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cron_status" AS ENUM('running', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "membership_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer NOT NULL,
	"duration_months" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mp_price_cents_check" CHECK ("membership_plan"."price_cents" >= 0),
	CONSTRAINT "mp_duration_months_check" CHECK ("membership_plan"."duration_months" > 0)
);
--> statement-breakpoint
CREATE TABLE "business_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"plan_id" text,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"amount_cents" integer NOT NULL,
	"payment_evidence_url" text,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bs_date_order_check" CHECK ("business_subscription"."end_date" >= "business_subscription"."start_date"),
	CONSTRAINT "bs_amount_check" CHECK ("business_subscription"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sponsorship_tier" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"priority" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "st_priority_check" CHECK ("sponsorship_tier"."priority" > 0)
);
--> statement-breakpoint
CREATE TABLE "sponsorship" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"category_id" text NOT NULL,
	"tier_id" text,
	"status" "sponsorship_status" DEFAULT 'scheduled' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"amount_cents" integer NOT NULL,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sp_date_order_check" CHECK ("sponsorship"."end_date" >= "sponsorship"."start_date"),
	CONSTRAINT "sp_amount_check" CHECK ("sponsorship"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cron_run" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" "cron_status" DEFAULT 'running' NOT NULL,
	"summary" text,
	"error" text,
	"rows_affected" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "membership_plan" ADD CONSTRAINT "membership_plan_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_subscription" ADD CONSTRAINT "business_subscription_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_subscription" ADD CONSTRAINT "business_subscription_plan_id_membership_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_tier" ADD CONSTRAINT "sponsorship_tier_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship" ADD CONSTRAINT "sponsorship_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship" ADD CONSTRAINT "sponsorship_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship" ADD CONSTRAINT "sponsorship_tier_id_sponsorship_tier_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."sponsorship_tier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_city_active_idx" ON "membership_plan" USING btree ("city_id") WHERE "membership_plan"."active" = true;--> statement-breakpoint
CREATE INDEX "bs_business_end_idx" ON "business_subscription" USING btree ("business_id","end_date");--> statement-breakpoint
CREATE INDEX "bs_paid_end_idx" ON "business_subscription" USING btree ("payment_status","end_date") WHERE "business_subscription"."payment_status" = 'paid';--> statement-breakpoint
CREATE UNIQUE INDEX "st_city_priority_idx" ON "sponsorship_tier" USING btree ("city_id","priority");--> statement-breakpoint
CREATE INDEX "sp_cat_status_dates_idx" ON "sponsorship" USING btree ("category_id","status","start_date","end_date");--> statement-breakpoint
CREATE INDEX "sp_business_idx" ON "sponsorship" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sp_status_end_idx" ON "sponsorship" USING btree ("status","end_date");--> statement-breakpoint
CREATE INDEX "cr_job_started_idx" ON "cron_run" USING btree ("job_name","started_at");