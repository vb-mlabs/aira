import { Leaf } from "lucide-react"
import type { Business } from "@aira/validators/businesses"
import { BusinessCard } from "./business-card"

// Three user-facing sections on category listing pages — matches the
// mobile app's SlotSection layout (2026-07-27 alignment):
//
//   Sponsored (top) — sponsorship_tier.display_slot === 'top',
//                     tier1-texture header (olive green).
//   Sponsored (mid) — sponsorship_tier.display_slot === 'mid',
//                     tier2-texture header (burnt orange). Both this
//                     and the top section carry the same "Sponsored"
//                     label; the texture is the entire within-Sponsored
//                     hierarchy cue.
//   Regular         — sponsored_slot === 'regular' or NULL
//                     (unsponsored), tier3-texture. Sponsored-with-
//                     regular-slot businesses render first inside this
//                     section, no distinguishing color.
//
// Users never see "Level 2" or "Top" / "Mid" as text; header texture +
// per-card chrome carry the whole visual hierarchy.

interface SlotSectionProps {
  label: "Sponsored" | "Regular"
  texture:
    | "/textures/tier1-texture.webp"
    | "/textures/tier2-texture.webp"
    | "/textures/tier3-texture.webp"
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
 * getBusinessesByCategory* queries) into three user-facing sections
 * — mirrors apps/mobile/features/listings/components/SlotSection.tsx.
 *
 * top     = sponsored_slot === 'top'
 * mid     = sponsored_slot === 'mid'
 * regular = sponsored_slot === 'regular' OR null (unsponsored)
 *
 * Within each bucket the input order is preserved — the query already
 * sorted by tier priority + amount within a slot.
 */
export function bucketBySlot(items: Business[]): {
  top: Business[]
  mid: Business[]
  regular: Business[]
} {
  const top: Business[] = []
  const mid: Business[] = []
  const regular: Business[] = []
  for (const b of items) {
    if (b.sponsored_slot === "top") top.push(b)
    else if (b.sponsored_slot === "mid") mid.push(b)
    else regular.push(b)
  }
  return { top, mid, regular }
}
