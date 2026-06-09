import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { getBusinessByIdAdminOp } from "@/server/operations/businesses-admin"
import { listCategoriesOp } from "@/server/operations/categories"
import { BusinessAdminDetail } from "@/features/admin/components/business-detail"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const res = await apiServerFetch(getBusinessByIdAdminOp, { input: { id } })
  const name = res.data?.business?.name ?? "Business"
  return { title: `Admin · ${name}` }
}

export default async function AdminBusinessDetailPage({ params }: PageProps) {
  const { id } = await params
  const [bizRes, catRes] = await Promise.all([
    apiServerFetch(getBusinessByIdAdminOp, { input: { id } }),
    apiServerFetch(listCategoriesOp, { input: {} }),
  ])
  const business = bizRes.data?.business

  if (!business) notFound()

  const categories = catRes.data?.categories ?? []

  return <BusinessAdminDetail business={business} categories={categories} />
}
