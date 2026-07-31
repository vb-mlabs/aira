import Link from "next/link"
import { BadgeCheck, Download, Plus, Store } from "lucide-react"
import { Suspense } from "react"
import { apiServerFetch } from "@aira/api/server"
import { listAllBusinessesAdminOp } from "@/server/operations/businesses-admin"
import { AdminBadge } from "@/features/admin"
import { BusinessBroadcastButton } from "@/features/admin/components/business-broadcast-modal"
import { expiryLabel } from "@/features/admin/renewals/expiry-label"
import { EmptyState } from "@/lib/ui"
import { cn } from "@aira/ui-web/utils"
import { AdminPageHeader } from "../_components/page-header"
import { RenewingFilter } from "./_components/renewing-filter"

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const metadata = { title: "Admin · Businesses" }
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    archived?: string
    renewing?: string
  }>
}

export default async function AdminBusinessesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const archivedOnly = sp.archived === "1"
  const renewing = sp.renewing ? parseInt(sp.renewing, 10) : undefined
  const res = await apiServerFetch(listAllBusinessesAdminOp, {
    input: {
      archivedOnly: archivedOnly || undefined,
      renewing: renewing || undefined,
    },
  })
  const businesses = res.data?.items ?? []

  const csvParams = new URLSearchParams()
  if (renewing) csvParams.set("renewing", String(renewing))
  const csvHref = `/api/v1/admin/businesses/renewals.csv?${csvParams.toString()}`

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Manage listings"
        subtitle="View and edit directory listings."
        actions={
          <>
            {renewing && (
              <a
                href={csvHref}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Download className="size-4" aria-hidden />
                Download CSV
              </a>
            )}
            <BusinessBroadcastButton />
            <Link
              href="/admin/businesses/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" aria-hidden />
              Add business
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/businesses"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            !archivedOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/60",
          )}
        >
          Active
        </Link>
        <Link
          href="/admin/businesses?archived=1"
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            archivedOnly
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/60",
          )}
        >
          Archived
        </Link>

        <div className="h-4 w-px bg-border" />

        <Suspense>
          <RenewingFilter />
        </Suspense>
      </div>

      {businesses.length === 0 ? (
        <EmptyState
          icon={Store}
          title={renewing ? `No businesses renewing within ${renewing} days` : "No businesses yet"}
          description={renewing ? "Adjust the renewal window or check back later." : "Add your first business to get started."}
          action={!renewing ? { label: "Add business", href: "/admin/businesses/new" } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Subscription</th>
                <th className="px-4 py-3 text-left font-semibold">Due date</th>
                <th className="px-4 py-3 text-left font-semibold">Sponsorship</th>
                <th className="px-4 py-3 text-left font-semibold">End date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {businesses.map((b) => {
                const archived = b.deleted_at !== null
                const days = b.latest_subscription_days_remaining
                const endDate = b.latest_subscription_end_date
                // days_remaining < 0 takes the overdue treatment regardless
                // of payment_status — surfaces the data-quality window
                // between expiry and the renewal cron flipping the badge.
                const isOverdue = days !== null && days < 0
                const isCritical = days !== null && days >= 0 && days <= 3
                return (
                  <tr
                    key={b.id}
                    className={cn(
                      "relative cursor-pointer hover:bg-muted/20",
                      archived && "opacity-60",
                      isOverdue &&
                        "bg-destructive/[0.04] shadow-[inset_3px_0_0_var(--destructive)] hover:bg-destructive/[0.08]",
                    )}
                  >
                    <td className="px-4 py-3">
                      {/* after:* pseudo-element stretches the link across the
                          entire row so any cell click navigates to the
                          detail page. The actual <Link> stays in the DOM for
                          keyboard + screen-reader navigation. The verified
                          checkmark sits inside the <Link> so the whole
                          "Name ✓" reads as one row-scan target. */}
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="inline-flex items-center gap-1.5 font-medium text-foreground after:absolute after:inset-0 after:content-['']"
                      >
                        {b.name}
                        {b.verified && (
                          <span
                            title={b.verification_notes ?? "Verified"}
                            className="inline-flex"
                          >
                            <BadgeCheck
                              className="size-4 fill-info text-info-foreground"
                              aria-label="Verified"
                            />
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.category_name ?? b.category}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {b.latest_plan_name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {days !== null && endDate !== null ? (
                        <span
                          className={cn(
                            "text-sm",
                            isOverdue
                              ? "font-bold uppercase tracking-wide text-destructive"
                              : isCritical
                                ? "font-semibold text-destructive"
                                : "text-muted-foreground",
                          )}
                        >
                          {expiryLabel(days, endDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {b.latest_sponsorship_tier_name ? (
                        <span
                          className={cn(
                            b.latest_sponsorship_status === "scheduled" &&
                              "text-muted-foreground",
                          )}
                        >
                          {b.latest_sponsorship_tier_name}
                          {b.latest_sponsorship_status === "scheduled" && (
                            <span className="ml-1 text-xs italic text-muted-foreground">
                              (scheduled)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.latest_sponsorship_end_date ? (
                        formatShortDate(b.latest_sponsorship_end_date)
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge
                        variant={archived ? "archived" : "active"}
                        label={archived ? "Archived" : "Active"}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
