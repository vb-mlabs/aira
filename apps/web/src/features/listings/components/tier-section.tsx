import { Leaf, Plus, type LucideIcon } from "lucide-react"
import { TIER_LABELS } from "@aira/validators"
import { BusinessCard } from "./business-card"
import type { Business, BusinessTier } from "../types"

// Texture + icon are presentation choices specific to the tier-section
// heading; the label itself flows through TIER_LABELS so it stays in
// lockstep with the badge on the business card and the admin tables.
const TIER_PRESENTATION: Record<BusinessTier, { texture: string; Icon: LucideIcon }> = {
  tier1: {
    texture: "/textures/tier1-texture.webp",
    Icon: Leaf,
  },
  tier2: {
    texture: "/textures/tier2-texture.webp",
    Icon: Plus,
  },
  tier3: {
    texture: "/textures/tier3-texture.webp",
    Icon: Leaf,
  },
}

interface TierSectionProps {
  tier: BusinessTier
  businesses: Business[]
  /** Anonymous callers get no heart. Defaults false so call sites that
   *  haven't been updated yet keep rendering. */
  isSignedIn?: boolean
  /** Set of business ids the caller has already favorited. */
  favIds?: ReadonlySet<string>
}

export function TierSection({
  tier,
  businesses,
  isSignedIn = false,
  favIds,
}: TierSectionProps) {
  if (businesses.length === 0) return null
  const { texture, Icon } = TIER_PRESENTATION[tier]
  const label = TIER_LABELS[tier]

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
        <Icon className="size-6 text-white/70" aria-hidden />
      </div>
      <ul className="space-y-3">
        {businesses.map((b) => (
          <li key={b.id}>
            <BusinessCard
              business={b}
              isSignedIn={isSignedIn}
              isFavorited={favIds?.has(b.id) ?? false}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
