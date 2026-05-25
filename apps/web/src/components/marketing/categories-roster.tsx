// "From dosa to doctors" — editorial numbered roster of the 7 top-level
// AIRA categories. Static for the marketing page; admin-managed categories
// don't ship until Sprint 2 (PRD F6). Each row uses a tier-color border-
// bottom to teach the visitor the hierarchy color system before they ever
// reach the listings page.
//
// Marketing copy lives inline (allowlisted in tooling/eslint-config — T9).

import { Ornament } from "./_ornament"

type Tier = "tier1" | "tier2" | "tier3"

type Category = {
  numeral: string
  name: string
  examples: string
  tier: Tier
}

const categories: Category[] = [
  {
    numeral: "I.",
    name: "Restaurants",
    examples:
      "Vegetarian · Punjabi · South Indian · Chaat & street food · Sweet shops",
    tier: "tier1",
  },
  {
    numeral: "II.",
    name: "Education",
    examples:
      "Tutoring · Music & dance schools · Language classes · Test prep",
    tier: "tier1",
  },
  {
    numeral: "III.",
    name: "Events & Entertainment",
    examples:
      "Wedding planning · Mandap rental · DJs · Photographers · Decorators",
    tier: "tier2",
  },
  {
    numeral: "IV.",
    name: "Professional Services",
    examples:
      "Lawyers · Accountants · Realtors · Immigration · Financial planners",
    tier: "tier1",
  },
  {
    numeral: "V.",
    name: "Health & Wellness",
    examples:
      "Doctors · Dentists · Yoga & ayurveda · Salons & spas · Pediatrics",
    tier: "tier2",
  },
  {
    numeral: "VI.",
    name: "Real Estate",
    examples: "Buying · Renting · Commercial · Property management",
    tier: "tier3",
  },
  {
    numeral: "VII.",
    name: "Shopping",
    examples: "Grocery · Apparel & sarees · Jewelry · Electronics · Books",
    tier: "tier1",
  },
]

export function CategoriesRoster() {
  return (
    <section
      id="categories"
      className="px-6 pb-[120px] pt-[40px] md:pb-[120px] md:pt-[40px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-16 text-center">
          <Ornament />
          <span className="block text-[11px] font-bold uppercase tracking-[3px] text-brand-gold">
            What you&rsquo;ll find
          </span>
          <h2 className="mt-3.5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
            From <em className="font-bold italic text-primary">dosa</em> to{" "}
            <em className="font-bold italic text-primary">doctors</em>.
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-[1.65] text-muted-foreground">
            Seven categories, nested up to three levels deep. The color tells
            you where you are.
          </p>
        </header>

        <div className="mx-auto max-w-[760px]">
          {categories.map((cat, i) => (
            <div
              key={cat.numeral}
              className={
                "grid grid-cols-[40px_1fr_24px] items-baseline gap-4 border-t border-border/25 py-8 md:grid-cols-[64px_1fr_auto] md:gap-6 " +
                (i === categories.length - 1
                  ? "border-b border-border/25"
                  : "")
              }
            >
              <span className="font-display text-[22px] font-medium italic tracking-wide text-brand-gold md:text-[28px]">
                {cat.numeral}
              </span>
              <div>
                <h3
                  className={
                    "inline-block pb-1 font-display text-[26px] font-semibold leading-[1.1] text-foreground md:text-[34px] " +
                    tierBorder(cat.tier)
                  }
                >
                  {cat.name}
                </h3>
                <p className="mt-1 font-display text-[16px] italic leading-[1.5] text-muted-foreground">
                  {cat.examples}
                </p>
              </div>
              <span className="self-center font-display text-2xl text-brand-gold md:text-[28px]">
                ›
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function tierBorder(tier: Tier): string {
  switch (tier) {
    case "tier1":
      return "border-b-2 border-[color:var(--tier1)]"
    case "tier2":
      return "border-b-2 border-[color:var(--tier2)]"
    case "tier3":
      return "border-b-2 border-[color:var(--tier3)]"
  }
}

