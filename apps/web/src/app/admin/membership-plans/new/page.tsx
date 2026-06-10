import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { PlanForm } from "../_components/plan-form"

export const metadata = { title: "Admin · New Membership Plan" }

export default function NewMembershipPlanPage() {
  return (
    <AdminFormModal title="New membership plan" backHref="/admin/membership-plans">
      <PlanForm />
    </AdminFormModal>
  )
}
