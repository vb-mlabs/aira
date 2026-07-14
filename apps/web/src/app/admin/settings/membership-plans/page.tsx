import Link from "next/link"
import { CreditCard, Plus } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { listMembershipPlansOp } from "@/server/operations/membership-plans"
import { EmptyState } from "@/lib/ui"
import { AdminPageHeader } from "../../_components/page-header"
import { PlanList } from "./_components/plan-list"

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
        <PlanList plans={plans} />
      )}
    </div>
  )
}
