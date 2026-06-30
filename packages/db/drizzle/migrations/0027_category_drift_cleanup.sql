-- Data-only cleanup of four drift artefacts surfaced when admin
-- "Add business" was investigated for category source-of-truth:
--
--   1. One orphan business with category='food-dining' — that slug
--      is in neither VALID_CATEGORIES nor the category DB table.
--      Re-home to 'restaurants' (closest semantic match for an Indian
--      catering business).
--
--   2. Seven stale sponsorship rows attached to Ayurveda Wellness
--      (biz-009), all pointing at the qa-deactivate-1781028692142
--      category, all created 2026-06-10 between 07:21 and 09:00 —
--      leftover sponsorships from a prior QA run. Surfaced when the
--      original pre-check raised; the user authorised the deletion in
--      the /mlabs-code pause-handling step on 2026-06-16. Must DELETE
--      before the category delete (sponsorship FK is ON DELETE
--      RESTRICT).
--
--   3. Five QA junk rows in the `category` table from prior test
--      fixtures (slug LIKE 'qa-%' — 2 level-1 roots, 2 level-2
--      children, 1 level-1 "deactivate" test). business_category is
--      ON DELETE CASCADE, so it auto-clears. After step 2 the
--      pre-check should pass; kept as a defensive safety net in case
--      a concurrent insert sneaks in between.
--
--   4. Two stale business_category join rows joining Ayurveda Wellness
--      (a wellness business) to Restaurants + Events &
--      Entertainment — nonsensical, leftover test data.
--
-- Pattern follows 0026_purge_homepage_settings.sql: data-only, no
-- schema change, snapshot copied forward from 0026 (schema unchanged).

-- 1. Re-home the food-dining orphan.
UPDATE businesses
SET category = 'restaurants', updated_at = now()
WHERE category = 'food-dining';

-- 2. Drop the 7 stale Ayurveda Wellness sponsorships pointing at QA
-- junk categories. Authorised by user in /mlabs-code pause-handling
-- on 2026-06-16; see .mstack/code/2026-06-16-category-drift-fix/log.md.
DELETE FROM sponsorship
WHERE category_id IN (SELECT id FROM category WHERE slug LIKE 'qa-%');

-- 3. Defensive FK pre-check before deleting QA junk categories. Abort
-- loudly with the offending sponsorship ids if step 2 missed any
-- (shouldn't happen — but a concurrent insert would).
DO $$
DECLARE
  blocking_ids text;
BEGIN
  SELECT string_agg(s.id, ', ') INTO blocking_ids
  FROM sponsorship s
  JOIN category c ON c.id = s.category_id
  WHERE c.slug LIKE 'qa-%';
  IF blocking_ids IS NOT NULL THEN
    RAISE EXCEPTION 'category cleanup blocked: sponsorship row(s) reference qa-* categories: %', blocking_ids;
  END IF;
END $$;

DELETE FROM category WHERE slug LIKE 'qa-%';

-- 4. Drop the 2 nonsensical Ayurveda Wellness join rows. Identified
-- by joining on the unique slug + the two target category slugs.
DELETE FROM business_category bc
USING businesses b
WHERE bc.business_id = b.id
  AND b.slug = 'ayurveda-wellness'
  AND bc.category_id IN (
    SELECT id FROM category WHERE slug IN ('restaurants', 'events-entertainment')
  );
