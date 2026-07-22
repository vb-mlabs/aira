// Mobile category metadata — display name + MaterialCommunityIcons glyph name
// per category slug. Mirrors apps/web/src/features/listings/category-meta.ts
// but swaps lucide-react icons for @expo/vector-icons (already installed)
// so we don't add a new dep. Same fallback-on-unknown-slug semantics.

import type { MaterialCommunityIcons } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface CategoryMeta {
  slug: string;
  displayName: string;
  description: string;
  iconName: IconName;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  restaurants: {
    slug: "restaurants",
    displayName: "Restaurants",
    description: "Authentic flavours from across India",
    iconName: "silverware-fork-knife",
  },
  education: {
    slug: "education",
    displayName: "Education",
    description: "Schools, tutors, language and culture",
    iconName: "school",
  },
  "events-entertainment": {
    slug: "events-entertainment",
    displayName: "Events & Entertainment",
    description: "Gatherings, music, and celebrations",
    iconName: "party-popper",
  },
  "professional-services": {
    slug: "professional-services",
    displayName: "Professional Services",
    description: "Legal, financial, and consulting",
    iconName: "briefcase",
  },
  "health-wellness": {
    slug: "health-wellness",
    displayName: "Health & Wellness",
    description: "Clinics, yoga, and Ayurveda",
    iconName: "heart",
  },
  "real-estate": {
    slug: "real-estate",
    displayName: "Real Estate",
    description: "Buying, selling, and renting",
    iconName: "office-building",
  },
  shopping: {
    slug: "shopping",
    displayName: "Shopping",
    description: "Grocery, fashion, and gifts",
    iconName: "shopping",
  },
};

/** `resolvedName` — the display name looked up from the DB categories
 *  table via `business.category_name`. When provided, it wins over the
 *  slug for the fallback path so admin-created categories render their
 *  real name instead of the raw slug. Seeded slugs keep their curated
 *  metadata (icon + description). Mirrors the web version at
 *  apps/web/src/features/listings/category-meta.ts. */
export function getCategoryMeta(
  slug: string,
  resolvedName?: string | null,
): CategoryMeta {
  return (
    CATEGORY_META[slug] ?? {
      slug,
      displayName: resolvedName ?? slug,
      description: "",
      iconName: "tag",
    }
  );
}

export const CATEGORIES_ORDERED: readonly CategoryMeta[] = [
  CATEGORY_META.restaurants,
  CATEGORY_META.education,
  CATEGORY_META["events-entertainment"],
  CATEGORY_META["professional-services"],
  CATEGORY_META["health-wellness"],
  CATEGORY_META["real-estate"],
  CATEGORY_META.shopping,
] as const;
