// Repo map for new devs landing on the template. Shows what's in /apps
// and /packages so the monorepo layout is the first thing they see.

export function ProductMock() {
  return (
    <div className="relative mx-auto max-w-6xl px-6 pb-24">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-4 font-mono text-[11px] text-muted-foreground">
            ~/hat-yai
          </span>
        </div>
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          <TreeColumn
            title="apps/"
            subtitle="User-facing surfaces"
            entries={[
              { name: "web", note: "Next.js 15 — marketing, auth, admin, billing, messaging, storage" },
              { name: "mobile", note: "Expo + expo-router, BetterAuth shared with web, NativeWind, image picker, secure store, Maestro e2e" },
            ]}
          />
          <TreeColumn
            title="packages/"
            subtitle="Shared workspace libraries"
            entries={[
              { name: "api", note: "tRPC routers — typed server ↔ client contract" },
              { name: "auth", note: "BetterAuth setup + session helpers" },
              { name: "config", note: "brand, design tokens, single source of truth" },
              { name: "db", note: "Drizzle schema, migrations, client" },
              { name: "email", note: "Resend client + React Email templates" },
              { name: "services", note: "Billing (Stripe), messaging, admin, webhooks" },
              { name: "ui-web", note: "shadcn-style components, Tailwind v4" },
              { name: "validators", note: "Zod schemas shared across apps + api" },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function TreeColumn({
  title,
  subtitle,
  entries,
}: {
  title: string
  subtitle: string
  entries: ReadonlyArray<{ name: string; note: string }>
}) {
  return (
    <div className="border-b border-border p-6 last:border-b-0 md:border-b-0 md:[&:not(:last-child)]:border-r">
      <div className="mb-1 font-mono text-[13px] font-bold text-primary">
        {title}
      </div>
      <div className="mb-4 text-[11px] uppercase tracking-widest text-muted-foreground">
        {subtitle}
      </div>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.name} className="flex items-baseline gap-3">
            <span className="font-mono text-[13px] font-semibold text-foreground">
              {e.name}
            </span>
            <span className="text-[13px] leading-snug text-muted-foreground">
              {e.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
