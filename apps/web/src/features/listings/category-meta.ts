// Display metadata for the 7 seeded directory categories. The runtime
// catalog of which categories exist is the `category` DB table managed
// via /admin/settings/categories — this file just attaches a curated
// icon + tagline + label to each known slug. Admin-created categories
// that aren't in this map fall through `getCategoryMeta()` to a generic
// Tag icon + slug-as-name so the sidebar / listings pages don't render
// undefined.

import {
  UtensilsCrossed,
  GraduationCap,
  PartyPopper,
  Briefcase,
  Heart,
  Building2,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react"
import type { BusinessCategory } from "./types"

export interface CategoryMeta {
  slug: BusinessCategory
  displayName: string
  description: string
  icon: LucideIcon
}

export const CATEGORY_META: Record<BusinessCategory, CategoryMeta> = {
  restaurants: {
    slug: "restaurants",
    displayName: "Restaurants",
    description: "Authentic flavours from across India",
    icon: UtensilsCrossed,
  },
  education: {
    slug: "education",
    displayName: "Education",
    description: "Schools, tutors, language and culture",
    icon: GraduationCap,
  },
  "events-entertainment": {
    slug: "events-entertainment",
    displayName: "Events & Entertainment",
    description: "Gatherings, music, and celebrations",
    icon: PartyPopper,
  },
  "professional-services": {
    slug: "professional-services",
    displayName: "Professional Services",
    description: "Legal, financial, and consulting",
    icon: Briefcase,
  },
  "health-wellness": {
    slug: "health-wellness",
    displayName: "Health & Wellness",
    description: "Clinics, yoga, and Ayurveda",
    icon: Heart,
  },
  "real-estate": {
    slug: "real-estate",
    displayName: "Real Estate",
    description: "Buying, selling, and renting",
    icon: Building2,
  },
  shopping: {
    slug: "shopping",
    displayName: "Shopping",
    description: "Grocery, fashion, and gifts",
    icon: ShoppingBag,
  },
}

/** Safe lookup for any slug (seeded or admin-created). Returns the
 *  curated metadata when known, or a generic `Tag`-icon + slug-as-name
 *  fallback so consumers never read `undefined`. Prefer this over
 *  indexing `CATEGORY_META` directly in new code. */
export function getCategoryMeta(slug: string): CategoryMeta {
  const known = (CATEGORY_META as Record<string, CategoryMeta | undefined>)[slug]
  if (known) return known
  return {
    slug,
    displayName: slug,
    description: "",
    icon: Tag,
  }
}

/** Ordered list — drives sidebar + /categories page rendering. */
export const CATEGORIES_ORDERED: readonly CategoryMeta[] = [
  CATEGORY_META.restaurants,
  CATEGORY_META.education,
  CATEGORY_META["events-entertainment"],
  CATEGORY_META["professional-services"],
  CATEGORY_META["health-wellness"],
  CATEGORY_META["real-estate"],
  CATEGORY_META.shopping,
] as const
