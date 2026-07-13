ALTER TABLE "sponsorship_tier" DROP CONSTRAINT "st_max_slots_check";--> statement-breakpoint
ALTER TABLE "sponsorship" DROP CONSTRAINT "sponsorship_category_id_category_id_fk";
--> statement-breakpoint
DROP INDEX "sp_cat_status_dates_idx";--> statement-breakpoint
DROP INDEX "sp_business_idx";--> statement-breakpoint
CREATE INDEX "sp_business_status_dates_idx" ON "sponsorship" USING btree ("business_id","status","start_date","end_date");--> statement-breakpoint
ALTER TABLE "sponsorship_tier" DROP COLUMN "max_slots";--> statement-breakpoint
-- Collapse per-category sponsorship rows to per-business before dropping
-- category_id. Only active + scheduled rows are deduped; expired + cancelled
-- rows are historical and left alone (their category_id column drops with
-- the ALTER TABLE below, but their status prevents display-side impact).
--
-- Dedup rule (for each business):
--   1. lowest tier priority (COALESCE NULL to 999999 so untierred rows lose)
--   2. latest end_date
--   3. max amount_cents
--   4. deterministic id tie-break (last resort — should be unreachable)
--
-- Run `pnpm --filter @aira/db audit:orphan-sponsorships` BEFORE this
-- migration to preview which rows will survive per business.
WITH ranked AS (
  SELECT
    s.id,
    ROW_NUMBER() OVER (
      PARTITION BY s.business_id
      ORDER BY
        COALESCE(st.priority, 999999) ASC,
        s.end_date DESC,
        s.amount_cents DESC,
        s.id ASC
    ) AS rn
  FROM sponsorship s
  LEFT JOIN sponsorship_tier st ON st.id = s.tier_id
  WHERE s.status IN ('active', 'scheduled')
)
DELETE FROM sponsorship
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint
ALTER TABLE "sponsorship" DROP COLUMN "category_id";
