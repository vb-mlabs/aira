-- Sprint 1 — migrate user.role from free-form text to user_role enum.
-- Plan: create enum, sanity-check existing data, remap 'user' -> 'end_user',
--   then alter column type. Hand-edited from drizzle-kit's generation to add
--   the pre-flight + data migration steps (drizzle-kit only emits the
--   schema-shape diff). See .mstack/reviews/2026-05-26-auth-rbac-hardening.md
--   T2 for the locked migration plan.

-- Step 1: declare the enum type.
CREATE TYPE "public"."user_role" AS ENUM('end_user', 'admin', 'super_admin');--> statement-breakpoint

-- Step 2: pre-flight. Abort if any row has a role outside the expected
--   pre-migration set {'user', 'admin'} — a manually inserted typo (e.g.
--   'Admin', 'superadmin') would silently lose data on the USING cast.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "user" WHERE role NOT IN ('user', 'admin')) THEN
    RAISE EXCEPTION 'user.role contains unexpected values; aborting enum migration. Run SELECT DISTINCT role FROM "user" to inspect.';
  END IF;
END $$;--> statement-breakpoint

-- Step 3: data migration — every legacy 'user' becomes 'end_user'.
--   'admin' is already a valid post-migration enum value, so it stays.
UPDATE "user" SET role = 'end_user' WHERE role = 'user';--> statement-breakpoint

-- Step 4: drop old default ('user'), which is no longer a valid enum value
--   and would prevent the SET DATA TYPE cast.
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint

-- Step 5: change column type. USING clause casts text -> enum; after step 3
--   every row's role is in the enum's value set, so the cast succeeds.
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint

-- Step 6: restore default as an enum literal.
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'end_user';
