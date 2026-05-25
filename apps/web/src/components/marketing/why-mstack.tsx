// The three things mstack gives you over raw Cursor / Claude. Maps 1:1
// to the brand tagline: guardrails, conventions, paper trail.

import type { ReactNode } from "react"

const pillars = [
  {
    title: "Guardrails",
    lede: "Ambiguity surfaces before the diff exists, not in PR review.",
    bullets: [
      "/mlabs-plan refuses to skip the persona + wedge + scope conversation.",
      "/mlabs-review locks decisions and raises blockers before any code is written.",
      "/mlabs-code pauses on destructive migrations, new deps, and brand/design changes.",
      "/mlabs-qa drives Playwright through the flows before merge.",
    ],
    icon: <ShieldIcon />,
  },
  {
    title: "Conventions",
    lede: "Every feature looks like it was built by the same team — because it was.",
    bullets: [
      "Package boundaries enforced: api / auth / services / ui-web stay in their lanes.",
      "Brand strings caught by ESLint — edit @mlabs/config, never a literal in JSX.",
      "Design tokens centralised; components live in @mlabs/ui-web.",
      "One atomic commit per task in /mlabs-code → bisectable history.",
    ],
    icon: <RulerIcon />,
  },
  {
    title: "Paper trail",
    lede: "The next dev can read why something was built, not just what.",
    bullets: [
      ".mstack/plans/ — the original consultation, persona, scope, tradeoffs.",
      ".mstack/reviews/ — what was approved, what was rejected, why.",
      ".mstack/code/<slug>/ — task ledger + run log per implementation.",
      ".mstack/qa/ — bug reports, screenshots, fix evidence.",
    ],
    icon: <ScrollIcon />,
  },
]

export function WhyMstack() {
  return (
    <section id="why" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Why mstack
          </div>
          <h2 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tighter md:text-5xl">
            You already have Claude.{" "}
            <span className="text-primary">This is what we add on top</span>.
          </h2>
          <p className="mx-auto mt-5 text-[16px] leading-relaxed text-muted-foreground">
            Raw AI coding is fast and forgets everything. mstack is the
            three things we wanted back: a forced plan before code, a
            forced review before merge, and a record of both that the next
            dev can read.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <Pillar key={p.title} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Pillar({
  title,
  lede,
  bullets,
  icon,
}: {
  title: string
  lede: string
  bullets: ReadonlyArray<string>
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-[18px] font-bold">{title}</h3>
      <p className="mb-5 text-[14px] leading-relaxed text-muted-foreground">
        {lede}
      </p>
      <ul className="space-y-2.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-baseline gap-2 text-[13px] leading-relaxed text-foreground/80"
          >
            <span
              aria-hidden
              className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-primary"
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function svgProps() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }
}

function ShieldIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
    </svg>
  )
}

function RulerIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M21.3 8.7 8.7 21.3a2.4 2.4 0 0 1-3.4 0L2.7 18.7a2.4 2.4 0 0 1 0-3.4L15.3 2.7a2.4 2.4 0 0 1 3.4 0l2.6 2.6a2.4 2.4 0 0 1 0 3.4z" />
      <path d="m7.5 10.5 2 2" />
      <path d="m10.5 7.5 2 2" />
      <path d="m13.5 4.5 2 2" />
      <path d="m4.5 13.5 2 2" />
    </svg>
  )
}

function ScrollIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </svg>
  )
}
