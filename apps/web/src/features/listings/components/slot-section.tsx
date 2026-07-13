import { Leaf } from "lucide-react"
import type { Business } from "@aira/validators/businesses"
import { BusinessCard } from "./business-card"

// Two user-facing sections on category listing pages:
//
//   Sponsored — businesses whose sponsorship_tier.display_slot is 'top'
//               or 'mid'. Renders top-slot cards first (sponsoredTop token
//               pair via `data-slot="top"` -> card chrome), mid-slot after.
//   Regular   — everyone else: sponsored-with-regular-slot businesses
//               (rendered first inside the section, no distinguishing color)
//               plus unsponsored businesses.
//
// Textures preserved from the old TierSection component — the tier1-texture
// still labels the Sponsored header, the tier3-texture still labels
// Regular. Users never see "Level 2" or "Top" / "Mid" as labels; the
// within-Sponsored differentiation is entirely color/chrome on the card.

interface SlotSectionProps {
  label: "Sponsored" | "Regular"
  texture: "/textures/tier1-texture.webp" | "/textures/tier3-texture.webp"
  businesses: Business[]
  isSignedIn?: boolean
  favIds?: ReadonlySet<string>
}

export function SlotSection({
  label,
  texture,
  businesses,
  isSignedIn = false,
  favIds,
}: SlotSectionProps) {
  if (businesses.length === 0) return null

  return (
    <section>
      <div
        className="relative mb-3 flex items-center justify-between overflow-hidden rounded-t-[8px] rounded-b-none px-4 py-3.5"
        style={{
          backgroundImage: `url(${texture})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <span className="font-display text-xl font-semibold text-white drop-shadow">
          {label}
        </span>
        <Leaf className="size-6 text-white/70" aria-hidden />
      </div>
      <ul className="space-y-3">
        {businesses.map((b) => (
          <li key={b.id}>
            <BusinessCard
              business={b}
              isSignedIn={isSignedIn}
              isFavorited={favIds?.has(b.id) ?? false}
              showCategory={false}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Bucket a flat, ordered list of businesses (already sorted by the
 * getBusinessesByCategory* queries) into the two user-facing sections.
 *
 * Sponsored = sponsored_slot === 'top' or 'mid'.
 * Regular   = sponsored_slot === 'regular' OR null (unsponsored).
 *
 * Within Sponsored the input order is preserved — the query already
 * sorted top before mid, and within each slot by tier priority + amount.
 */
export function bucketBySlot(items: Business[]): {
  sponsored: Business[]
  regular: Business[]
} {
  const sponsored: Business[] = []
  const regular: Business[] = []
  for (const b of items) {
    if (b.sponsored_slot === "top" || b.sponsored_slot === "mid") {
      sponsored.push(b)
    } else {
      regular.push(b)
    }
  }
  return { sponsored, regular }
}
