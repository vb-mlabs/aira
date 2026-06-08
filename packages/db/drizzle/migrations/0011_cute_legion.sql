ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_email_unique";--> statement-breakpoint
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_source_check";--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "type" text DEFAULT 'consumer' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "preferred_contact" text;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "preferred_time" text;--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_type_unique" ON "waitlist" USING btree ("email","type");--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_type_check" CHECK ("waitlist"."type" IN ('consumer', 'business'));--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_preferred_contact_check" CHECK ("waitlist"."preferred_contact" IS NULL OR "waitlist"."preferred_contact" IN ('phone', 'whatsapp', 'email'));--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_preferred_time_check" CHECK ("waitlist"."preferred_time" IS NULL OR "waitlist"."preferred_time" IN ('morning', 'afternoon', 'evening', 'anytime'));--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_source_check" CHECK ("waitlist"."source" IN ('marketing-hero', 'marketing-footer', 'business-mailto', 'business-listing-cta'));