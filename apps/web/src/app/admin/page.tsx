// Default admin landing page — a small dashboard of high-level counts plus
// links into the main admin sections. Replaces the previous behaviour where
// /admin was unreachable (only nested routes existed).

import Link from "next/link"
import { ArrowRight, ClipboardList, Store, Users } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import { CATEGORY_META } from "@/features/listings"

export const metadata = { title: "Admin · Dashboard" }
export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const res = await apiServerFetch(listBusinessesOp, { input: {} })
  const businesses = res.data?.items ?? []

  const total = businesses.length
  const verified = businesses.filter((b) => b.verified).length
  const byTier = {
    tier1: businesses.filter((b) => b.tier === "tier1").length,
    tier2: businesses.filter((b) => b.tier === "tier2").length,
    tier3: businesses.filter((b) => b.tier === "tier3").length,
  }

  const recent = businesses.slice(0, 5)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of the AIRA directory.
        </p>
      </header>

      {/* Counts */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total businesses" value={total} />
        <StatTile label="Verified" value={verified} />
        <StatTile label="Sponsored (Tier 1)" value={byTier.tier1} />
        <StatTile label="Featured (Tier 2)" value={byTier.tier2} />
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-xl text-foreground">Manage</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <QuickLink
            href="/admin/businesses"
            icon={Store}
            title="Businesses"
            description="View and edit directory listings."
          />
          <QuickLink
            href="/admin/users"
            icon={Users}
            title="Users"
            description="Manage roles and access."
          />
          <QuickLink
            href="/admin/audit"
            icon={ClipboardList}
            title="Audit log"
            description="Trace admin actions."
          />
        </div>
      </section>

      {/* Recent businesses */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-end justify-between">
            <h2 className="font-display text-xl text-foreground">
              Recent businesses
            </h2>
            <Link
              href="/admin/businesses"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border rounded-xl bg-card shadow-[var(--shadow-card)]">
            {recent.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/businesses/${b.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {b.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {CATEGORY_META[b.category]?.displayName ?? b.category}
                    </p>
                  </div>
                  <ArrowRight
                    className="size-4 flex-shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-card px-4 py-5 shadow-[var(--shadow-card)]">
      <p className="font-display text-3xl font-semibold leading-none text-primary">
        {value}
      </p>
      <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
    >
      <div
        aria-hidden
        className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight
        className="mt-1 size-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
