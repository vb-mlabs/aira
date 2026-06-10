import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { listSponsorshipTiersOp } from "@/server/operations/sponsorship-tiers"
import { AdminFormModal } from "@/features/admin/components/admin-form-modal"
import { TierForm } from "../_components/tier-form"

export const metadata = { title: "Admin · Edit Sponsorship Tier" }
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditSponsorshipTierPage({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(listSponsorshipTiersOp, { input: { includeInactive: true } })
  const tier = res.data?.items.find((t) => t.id === id)
  if (!tier) notFound()

  return (
    <AdminFormModal title={`Edit ${tier.name}`} backHref="/admin/sponsorship-tiers">
      <TierForm tier={tier} />
    </AdminFormModal>
  )
}
