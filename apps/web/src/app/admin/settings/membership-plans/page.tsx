import Link from "next/link"
import { CreditCard, Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { TIER_LABELS } from "@aira/validators"
import { listMembershipPlansOp } from "@/server/operations/membership-plans"
import { AdminBadge } from "@/features/admin"
import { EmptyState } from "@/lib/ui"
import { AdminPageHeader } from "../../_components/page-header"

export const metadata = { title: "Admin · Membership Plans" }
export const dynamic = "force-dynamic"

export default async function AdminMembershipPlansPage() {
  const res = await apiServerFetch(listMembershipPlansOp, { input: { includeInactive: true } })
  const plans = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Membership Plans"
        subtitle="Define the subscription plans businesses can purchase."
        actions={
          <Link
            href="/admin/settings/membership-plans/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden />
            New plan
          </Link>
        }
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No plans yet"
          description="Create a membership plan that businesses can subscribe to."
          action={{ label: "New plan", href: "/admin/settings/membership-plans/new" }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Tier</th>
                <th className="px-4 py-3 text-left font-semibold">Price</th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/settings/membership-plans/${plan.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {plan.name}
                    </Link>
                    {plan.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {plan.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs font-medium text-foreground">
                      {TIER_LABELS[plan.tier]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    ${(plan.price_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {plan.duration_months}{" "}
                    {plan.duration_months === 1 ? "month" : "months"}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge
                      variant={plan.active ? "active" : "inactive"}
                      label={plan.active ? "Active" : "Inactive"}
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
