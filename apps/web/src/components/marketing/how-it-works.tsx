// How AIRA Works — 3-step strip explaining the app flow: Discover →
// Connect → Grow Together. Slots directly below HeroV2 in the new
// landing composition; gated on the same NEXT_PUBLIC_LANDING_HERO_V2
// flag so the pre-launch landing stays unchanged when the flag is off.
//
// Visual reference: attached_assets/image_1790083840055.png (client
// brief crop showing this strip below the 3-tier hero).

import { Search, Store, Users } from "lucide-react"
import { brand } from "@aira/config"

const STEPS = [
  {
    Icon: Search,
    title: "Discover",
    body: `Search and explore trusted South Asian businesses in Atlanta.`,
  },
  {
    Icon: Store,
    title: "Connect",
    body: "Contact, save favorites, and engage with businesses you love.",
  },
  {
    Icon: Users,
    title: "Grow Together",
    body: "Support local entrepreneurs and strengthen our community.",
  },
] as const

export function HowItWorks() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="mb-10 text-center font-display text-[clamp(26px,3vw,34px)] font-bold text-foreground">
          How {brand.name} <span className="text-primary">Works</span>
        </h2>

        <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground shadow-[var(--shadow-primary-glow)]"
              >
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className="grid size-16 place-items-center text-primary"
              >
                <Icon className="size-14" strokeWidth={1.6} />
              </span>
              <h3 className="font-display text-xl font-bold leading-tight text-foreground">
                {title}
              </h3>
              <p className="max-w-[32ch] text-[14px] leading-[1.55] text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
