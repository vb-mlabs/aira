import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { TierForm } from "../_components/tier-form"

export const metadata = { title: "Admin · New Sponsorship Tier" }

export default function NewSponsorshipTierPage() {
  return (
    <AdminFormModal title="New sponsorship tier" backHref="/admin/settings/sponsorship-tiers">
      <TierForm />
    </AdminFormModal>
  )
}
