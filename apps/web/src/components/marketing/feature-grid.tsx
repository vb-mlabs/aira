// Catalogue of the workspace packages a new dev inherits when they fork
// this template. Each card maps 1:1 to a directory under packages/.

import type { ReactNode } from "react"

const packages = [
  {
    name: "@mlabs/api",
    body: "tRPC routers that own the server ↔ client contract. Add a new endpoint here, get a typed hook on the web app for free.",
    icon: <PlugIcon />,
  },
  {
    name: "@mlabs/auth",
    body: "BetterAuth wired with email/password + magic link, session helpers for both server components and middleware. Admin role baked in.",
    icon: <LockIcon />,
  },
  {
    name: "@mlabs/config",
    body: "Brand identity, design tokens, env validation. Edit brand.ts to rebrand — an ESLint rule keeps the brand name out of literal strings elsewhere.",
    icon: <PaletteIcon />,
  },
  {
    name: "@mlabs/db",
    body: "Drizzle schema, migration scripts, and a single Postgres client. Add a table, run the migrate script, ship.",
    icon: <DatabaseIcon />,
  },
  {
    name: "@mlabs/email",
    body: "Postmark driver + typed sends for verify-email, password-reset, and notification. Templates are React Email components branded from @mlabs/config — preview them live at /dev/emails. Console driver for local dev.",
    icon: <MailIcon />,
  },
  {
    name: "@mlabs/services",
    body: "Domain logic — billing (Stripe + webhooks), messaging, admin, notifications. Routes and UI stay thin; business logic lives here.",
    icon: <CogIcon />,
  },
  {
    name: "@mlabs/ui-web",
    body: "shadcn-style component library on Tailwind v4. Buttons, dialogs, forms — all themed from @mlabs/config tokens.",
    icon: <BrushIcon />,
  },
  {
    name: "@mlabs/validators",
    body: "Zod schemas shared between server routes, tRPC procedures, and client forms. One schema, one source of truth.",
    icon: <CheckShieldIcon />,
  },
]

export function FeatureGrid() {
  return (
    <section id="packages" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            What&apos;s in the box
          </div>
          <h2 className="text-balance text-4xl font-extrabold leading-[1.02] tracking-tighter md:text-5xl">
            Eight workspace packages,{" "}
            <span className="text-primary">already wired together</span>.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
            Every package solves a problem we hit on the first MVP. You
            inherit them on day zero so the first commit can be the
            feature, not the plumbing.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <PackageCard key={p.name} {...p} />
          ))}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Also wired at app level
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              On top of the packages,{" "}
              <span className="font-semibold text-foreground">apps/web</span>{" "}
              ships with a{" "}
              <span className="font-semibold text-foreground">storage subsystem</span>{" "}
              (driver-based, Replit driver included, avatar pipeline built
              on it), an{" "}
              <span className="font-semibold text-foreground">admin dashboard</span>{" "}
              (users + audit log),{" "}
              <span className="font-semibold text-foreground">in-app messaging</span>{" "}
              with conversation UI, and a{" "}
              <span className="font-semibold text-foreground">notifications</span>{" "}
              center.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              What to add when you need it
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Deliberately not in the box:{" "}
              <span className="font-semibold text-foreground">analytics</span>{" "}
              (PostHog),{" "}
              <span className="font-semibold text-foreground">background jobs</span>{" "}
              (Inngest / Trigger.dev),{" "}
              <span className="font-semibold text-foreground">feature flags</span>,
              S3-style storage driver, and a{" "}
              <span className="font-semibold text-foreground">Sentry</span>{" "}
              hookup. Pick a vendor when the first feature actually needs
              one — surfaced naturally in /mlabs-plan.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PackageCard({
  name,
  body,
  icon,
}: {
  name: string
  body: string
  icon: ReactNode
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-mono text-[15px] font-bold">{name}</h3>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  )
}

function svgProps(extra?: string) {
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
    className: extra,
  }
}

function PlugIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg {...svgProps()}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg {...svgProps()}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg {...svgProps()}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg {...svgProps()}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function CogIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function BrushIcon() {
  return (
    <svg {...svgProps()}>
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </svg>
  )
}

function CheckShieldIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
