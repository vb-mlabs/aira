// Single source of truth for the 7 directory categories. Sidebar, the
// /categories page, and the per-category route pages all read from here so
// labels, icons, and ordering stay in sync. The slug values mirror
// VALID_CATEGORIES in ./types — keep them aligned.

import {
  UtensilsCrossed,
  GraduationCap,
  PartyPopper,
  Briefcase,
  Heart,
  Building2,
  ShoppingBag,
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
