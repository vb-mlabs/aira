import Link from "next/link"
import { AlertTriangle, Layers, Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listSponsorshipTiersOp } from "@/server/operations/sponsorship-tiers"
import { AdminBadge } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import { DISPLAY_SLOT_LABELS } from "@aira/validators/sponsorship-tiers"
import { AdminPageHeader } from "../../_components/page-header"

export const metadata = { title: "Admin · Sponsorship Tiers" }
export const dynamic = "force-dynamic"

export default async function AdminSponsorshipTiersPage() {
  const res = await apiServerFetch(listSponsorshipTiersOp, { input: { includeInactive: true } })
  const tiers = res.data?.items ?? []

  // Post-migration reminder: the placement-single-axis migration seeded
  // every existing tier to display_slot='regular'. Any high-priority tier
  // still sitting at 'regular' probably needs to be re-classified to top
  // or mid — sponsored businesses in those tiers currently land in the
  // Regular section instead of the Sponsored section.
  const unclassifiedHighPriority = tiers.filter(
    (t) => t.active && t.display_slot === "regular" && t.priority <= 5,
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sponsorship Tiers"
        subtitle="Define placement tiers for category sponsorships. Lower priority number = better placement."
        actions={
          <Link
            href="/admin/settings/sponsorship-tiers/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            New tier
          </Link>
        }
      />

      {unclassifiedHighPriority.length > 0 ? (
        <div className="flex gap-3 rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-warning" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              High-priority tier{unclassifiedHighPriority.length === 1 ? "" : "s"} still on the Regular slot
            </p>
            <p className="text-muted-foreground">
              The placement-single-axis migration seeded every tier to Regular.
              Re-classify these to Top or Mid so sponsored businesses appear in
              the Sponsored section on listing pages:{" "}
              <span className="text-foreground">
                {unclassifiedHighPriority.map((t) => t.name).join(", ")}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      {tiers.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No tiers yet"
          description="Create a sponsorship tier to enable category placements."
          action={{ label: "New tier", href: "/admin/settings/sponsorship-tiers/new" }}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Priority</th>
                  <th className="px-4 py-3 text-left font-semibold">Slot</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tiers.map((tier) => (
                  <tr key={tier.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/settings/sponsorship-tiers/${tier.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {tier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {tier.priority}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {DISPLAY_SLOT_LABELS[tier.display_slot]}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge
                        variant={tier.active ? "active" : "inactive"}
                        label={tier.active ? "Active" : "Inactive"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Tiers determine sort priority on category listing pages — lower
            number wins. The Slot column controls which section a sponsored
            business lands in (Top / Mid appear inside the Sponsored section;
            Regular sends them to the Regular section).
          </p>
        </>
      )}
    </div>
  )
}
