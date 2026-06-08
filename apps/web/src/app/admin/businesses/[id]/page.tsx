import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { getBusinessByIdOp } from "@/server/operations/businesses"
import { BusinessAdminDetail } from "@/features/admin/components/business-detail"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(getBusinessByIdOp, { input: { id } })
  const name = res.data?.business?.name ?? "Business"
  return { title: `Admin · ${name}` }
}

export default async function AdminBusinessDetailPage({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(getBusinessByIdOp, { input: { id } })
  const business = res.data?.business

  if (!business) notFound()

  return <BusinessAdminDetail business={business} />
}
