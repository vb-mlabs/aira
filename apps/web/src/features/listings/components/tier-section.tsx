import { Leaf, Plus, type LucideIcon } from "lucide-react"
import { BusinessCard } from "./business-card"
import type { Business, BusinessTier } from "../types"

const TIER_CONFIG: Record<BusinessTier, { label: string; texture: string; Icon: LucideIcon }> = {
  tier1: {
    label: "Sponsored",
    texture: "/textures/tier1-texture.webp",
    Icon: Leaf,
  },
  tier2: {
    label: "Sponsored Level 2",
    texture: "/textures/tier2-texture.webp",
    Icon: Plus,
  },
  tier3: {
    label: "Regular Listings",
    texture: "/textures/tier3-texture.webp",
    Icon: Leaf,
  },
}

interface TierSectionProps {
  tier: BusinessTier
  businesses: Business[]
}

export function TierSection({ tier, businesses }: TierSectionProps) {
  if (businesses.length === 0) return null
  const { label, texture, Icon } = TIER_CONFIG[tier]

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
            <BusinessCard business={b} />
          </li>
        ))}
      </ul>
    </section>
  )
}
