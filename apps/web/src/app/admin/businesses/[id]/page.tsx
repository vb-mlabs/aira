import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { getBusinessByIdAdminOp } from "@/server/operations/businesses-admin"
import { listCategoriesTreeOp } from "@/server/operations/categories"
import { listCitiesForAdminOp } from "@/server/operations/cities-admin"
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
  const [bizRes, catRes, cityRes] = await Promise.all([
    apiServerFetch(getBusinessByIdAdminOp, { input: { id } }),
    apiServerFetch(listCategoriesTreeOp, { input: {} }),
    apiServerFetch(listCitiesForAdminOp, { input: {} }),
  ])
  const business = bizRes.data?.business
  const owner = bizRes.data?.owner ?? null

  if (!business) notFound()

  const tree = catRes.data?.tree ?? []

  // Unfiltered flat list — used by CategoryPreview's name lookup so a
  // listing whose primary slug points to a deactivated category still
  // resolves to a label (no UI gap on stale references).
  const categories = tree.flatMap(({ root, children }) => [root, ...children])

  // Active-filtered tree — fed into the Edit categories modal. Drop a
  // root entirely when it's inactive (carries its children with it);
  // drop individually-inactive children otherwise.
  const categoryTree = tree
    .filter(({ root }) => root.active)
    .map(({ root, children }) => ({
      root,
      children: children.filter((c) => c.active),
    }))

  const cities = cityRes.data?.cities ?? []

  return (
    <BusinessAdminDetail
      business={business}
      owner={owner}
      categories={categories}
      categoryTree={categoryTree}
      cities={cities}
    />
  )
}
