import Link from "next/link"
import { Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listSponsorshipTiersOp } from "@/server/operations/sponsorship-tiers"
import { cn } from "@aira/ui-web/utils"

export const metadata = { title: "Admin · Sponsorship Tiers" }
export const dynamic = "force-dynamic"

export default async function AdminSponsorshipTiersPage() {
  const res = await apiServerFetch(listSponsorshipTiersOp, { input: { includeInactive: true } })
  const tiers = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sponsorship Tiers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define the tiers used for category sponsorships. Lower priority number = better placement.
          </p>
        </div>
        <Link
          href="/admin/sponsorship-tiers/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden />
          New tier
        </Link>
      </header>

      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tiers yet.</p>
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
                      href={`/admin/sponsorship-tiers/${tier.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {tier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {tier.priority}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        tier.active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tier.active ? "Active" : "Inactive"}
                    </span>
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
