// Public types for features/listings. tier/category are kept as `text`
// columns in the DB and validated at this boundary instead of pgEnum so
// adding values doesn't require a migration round-trip — see the
// businesses schema header for the full rationale.

export const VALID_TIERS = ["tier1", "tier2", "tier3"] as const
export type BusinessTier = (typeof VALID_TIERS)[number]

export const VALID_CATEGORIES = [
  "restaurants",
  "education",
  "events-entertainment",
  "professional-services",
  "health-wellness",
  "real-estate",
  "shopping",
] as const
export type BusinessCategory = (typeof VALID_CATEGORIES)[number]

export interface Business {
  id: string
  name: string
  slug: string
  category: BusinessCategory
  description: string | null
  phone: string | null
  website: string | null
  address: string | null
  image_url: string | null
  tier: BusinessTier
  verified: boolean
  /** ISO 8601 */
  created_at: string
  /** ISO 8601 */
  updated_at: string
}
