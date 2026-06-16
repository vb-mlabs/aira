import Link from "next/link"
import { Layers, Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listSponsorshipTiersOp } from "@/server/operations/sponsorship-tiers"
import { AdminBadge } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import { AdminPageHeader } from "../../_components/page-header"

export const metadata = { title: "Admin · Sponsorship Tiers" }
export const dynamic = "force-dynamic"

export default async function AdminSponsorshipTiersPage() {
  const res = await apiServerFetch(listSponsorshipTiersOp, { input: { includeInactive: true } })
  const tiers = res.data?.items ?? []

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

      {tiers.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No tiers yet"
          description="Create a sponsorship tier to enable category placements."
          action={{ label: "New tier", href: "/admin/settings/sponsorship-tiers/new" }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Priority</th>
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
      )}
    </div>
  )
}
