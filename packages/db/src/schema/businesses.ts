// Community business directory listings.
//
// One row per listed business. Surfaces in /home (featured) and
// /listings/[category] (full category list). Admin populates rows via
// Drizzle Studio for MVP.
//
// Schema decisions (locked in /mlabs-review on 2026-05-27):
//
// 1. `tier` and `category` are plain text columns. Allowed values are
//    enforced by Zod constants (`VALID_TIERS`, `VALID_CATEGORIES`) in the
//    query layer at `apps/web/src/features/listings/server/queries.ts`.
//    Kept off pgEnum so adding a new tier/category doesn't require a DB
//    migration round-trip — Zod constant edit + lint pass is enough.
//
// 2. `slug` is admin-supplied, validated as kebab-case at insert. UNIQUE
//    so listing URLs (future: `/listings/<category>/<slug>`) are stable
//    and dedup is automatic.
//
// 3. `image_url` stores an absolute URL (Replit Object Storage in
//    production, or any external CDN). Upload UI is deferred — admin
//    pastes the URL in Drizzle Studio for MVP.
//
// 4. `verified` is the blue-tick badge surfaced on cards and detail.
//    Boolean, defaults false; admin promotes via Studio.
//
// 5. `updated_at` uses Drizzle's `$onUpdate` so any ORM-level update
//    refreshes the column without raw SQL triggers.
//
// 6. `owner_user_id` is the nullable FK to user.id used for admin
//    reachability (G1). ON DELETE SET NULL so anonymise-in-place cleanly
//    detaches without taking the business row. Owner mutations flow only
//    through the audited assignBusinessOwner / unassignBusinessOwner
//    service path; the column is intentionally NOT in
//    BusinessUpdateInputSchema so generic admin edits cannot mutate it.
//
// Indexes:
//   - businesses_category_tier_idx (category, tier) — getBusinessesByCategory
//     does WHERE category = ? ORDER BY tier; composite covers both.
//   - businesses_tier_idx (tier) — getFeaturedBusinesses pulls tier1+tier2
//     across all categories.
//   - businesses_owner_user_idx (owner_user_id, partial) — supports the
//     "my listings" query, the admin list "Has owner" filter, and the
//     broadcast targeting query. Partial on the linked subset since the
//     vast majority of rows are null-owned.

import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  numeric,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { cities } from "./cities"
import { user } from "./auth"

export const businesses = pgTable(
  "businesses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    /** One of VALID_CATEGORIES — validated in query layer. */
    category: text("category").notNull(),
    description: text("description"),
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    /** Free-text name of the person AIRA ops should contact about this
     *  listing (owner, manager, whoever picks up the phone). Admin-only —
     *  surfaced via BusinessAdminSchema, never on the public BusinessSchema. */
    contact_person: text("contact_person"),
    image_url: text("image_url"),
    facebook_url: text("facebook_url"),
    instagram_url: text("instagram_url"),
    whatsapp_number: text("whatsapp_number"),
    /** Free-text opening hours, e.g. "Mon–Fri: 9am–5pm, Sat: 10am–3pm". */
    hours: text("hours"),
    /** Editorial review written by the AIRA team. Shown on the detail page. */
    aira_review: text("aira_review"),
    /** One of VALID_TIERS — validated in query layer. Defaults to bottom tier. */
    tier: text("tier").notNull().default("tier3"),
    verified: boolean("verified").notNull().default(false),
    /** Admin-only free-text log of the verification decision — call
     *  refs, licence numbers, photo comparison notes. Nullable; capped
     *  at 1000 chars in Zod (DB is unbounded text). NEVER surfaced on
     *  the public BusinessSchema or /api/v1/businesses. */
    verification_notes: text("verification_notes"),
    /** Editorial rating 0–5 in 0.5 steps. NULL = unrated. CHECK constraint
     *  enforces the range at the DB level; the admin UI enforces the step. */
    rating: numeric("rating", { precision: 2, scale: 1, mode: "number" }),
    /** Nullable FK to cities. NULL until city-aware slugs (F25) assigns one. */
    city_id: text("city_id").references(() => cities.id),
    /** One of VALID_BUSINESS_TYPES — validated in Zod layer. */
    business_type: text("business_type"),
    /** One of VALID_YEARS_OPERATING — validated in Zod layer. */
    years_operating: text("years_operating"),
    /** Nullable FK to user.id for admin reachability (G1). Owner mutations
     *  flow only through the audited assign / unassign service path; the
     *  column is NOT in BusinessUpdateInputSchema. ON DELETE SET NULL so
     *  anonymise-in-place cleanly detaches. */
    owner_user_id: text("owner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /** Soft-delete tombstone. NULL = active; non-NULL = archived (timestamp
     *  of the archive action). Public reads filter on `IS NULL`; admin reads
     *  can opt into seeing archived rows. Hard-purge cron is S5 (F14). */
    deleted_at: timestamp("deleted_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("businesses_category_tier_idx").on(table.category, table.tier),
    index("businesses_tier_idx").on(table.tier),
    // Partial index for the active subset so public reads skip archived rows.
    // The composite (category, tier) covers the hot getBusinessesByCategory path.
    index("businesses_active_idx")
      .on(table.category, table.tier)
      .where(sql`${table.deleted_at} IS NULL`),
    // Partial index on the linked subset — supports the my-listings query,
    // admin "Has owner" filter, and broadcast targeting. Most rows are
    // null-owned, so the partial form keeps the index small.
    index("businesses_owner_user_idx")
      .on(table.owner_user_id)
      .where(sql`${table.owner_user_id} IS NOT NULL`),
    check(
      "businesses_rating_check",
      sql`${table.rating} IS NULL OR (${table.rating} >= 0 AND ${table.rating} <= 5)`,
    ),
  ],
)
