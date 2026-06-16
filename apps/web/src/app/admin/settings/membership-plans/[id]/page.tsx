import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { listMembershipPlansOp } from "@/server/operations/membership-plans"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { PlanForm } from "../_components/plan-form"

export const metadata = { title: "Admin · Edit Membership Plan" }
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditMembershipPlanPage({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(listMembershipPlansOp, { input: { includeInactive: true } })
  const plan = res.data?.items.find((p) => p.id === id)
  if (!plan) notFound()

  return (
    <AdminFormModal title={`Edit ${plan.name}`} backHref="/admin/settings/membership-plans">
      <PlanForm plan={plan} />
    </AdminFormModal>
  )
}
