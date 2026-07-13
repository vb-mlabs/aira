DROP INDEX "businesses_category_tier_idx";--> statement-breakpoint
DROP INDEX "businesses_tier_idx";--> statement-breakpoint
DROP INDEX "businesses_active_idx";--> statement-breakpoint
-- ADD display_slot with a temporary DEFAULT so existing rows backfill
-- without violating NOT NULL. Every existing sponsorship_tier row lands
-- at 'regular' — admins re-classify Top/Mid via the tier form post-deploy.
-- Then DROP DEFAULT so future INSERTs must specify display_slot explicitly.
ALTER TABLE "sponsorship_tier" ADD COLUMN "display_slot" text NOT NULL DEFAULT 'regular';--> statement-breakpoint
ALTER TABLE "sponsorship_tier" ALTER COLUMN "display_slot" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sponsorship_tier" ADD CONSTRAINT "st_display_slot_check" CHECK ("sponsorship_tier"."display_slot" IN ('top', 'mid', 'regular'));--> statement-breakpoint
CREATE INDEX "businesses_active_idx" ON "businesses" USING btree ("category") WHERE "businesses"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "tier";--> statement-breakpoint
ALTER TABLE "membership_plan" DROP COLUMN "tier";
