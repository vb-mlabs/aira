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
// Indexes:
//   - businesses_category_tier_idx (category, tier) — getBusinessesByCategory
//     does WHERE category = ? ORDER BY tier; composite covers both.
//   - businesses_tier_idx (tier) — getFeaturedBusinesses pulls tier1+tier2
//     across all categories.

import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"

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
    image_url: text("image_url"),
    facebook_url: text("facebook_url"),
    instagram_url: text("instagram_url"),
    whatsapp_number: text("whatsapp_number"),
    /** One of VALID_TIERS — validated in query layer. Defaults to bottom tier. */
    tier: text("tier").notNull().default("tier3"),
    verified: boolean("verified").notNull().default(false),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("businesses_category_tier_idx").on(table.category, table.tier),
    index("businesses_tier_idx").on(table.tier),
  ],
)
