import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoryMeta } from "@/features/listings/category-meta"
import { ListingView } from "@/features/listings/components/listing-view"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import { getCategoryBySlugOp, listCategoriesOp } from "@/server/operations/categories"

const PAGE_SIZE = 12

interface PageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<{
    q?: string
    page?: string
    verified?: string
  }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params
  const res = await apiServerFetch(getCategoryBySlugOp, { input: { slug: category } })
  const cat = res.data?.category
  if (!cat) return { title: "Not found" }
  // Prefer the DB row's name (admin-editable) over the static
  // metadata's displayName when both exist.
  return { title: cat.name ?? getCategoryMeta(cat.slug).displayName }
}

export default async function CategoryListingPage({
  params,
  searchParams,
}: PageProps) {
  const { category } = await params

  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const parsedPage = Number.parseInt(sp.page ?? "", 10)
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1
  const verified = sp.verified === "1" || sp.verified === "true"

  // Parallel fetch: this category (for 404), the businesses in it, and
  // the full active-category list (drives the switcher dropdown in
  // ListingView — pulled from the same `category` DB table the admin
  // edits via /admin/settings/categories).
  const [catRes, res, categoriesRes] = await Promise.all([
    apiServerFetch(getCategoryBySlugOp, { input: { slug: category } }),
    apiServerFetch(listBusinessesOp, {
      input: {
        category,
        q,
        page,
        pageSize: PAGE_SIZE,
        verified: verified || undefined,
      },
    }),
    apiServerFetch(listCategoriesOp, { input: {} }),
  ])

  if (!catRes.data?.category) notFound()

  const items = res.data?.items ?? []
  const total = res.data?.total ?? 0
  const responsePage = res.data?.page ?? page
  const responsePageSize = res.data?.pageSize ?? PAGE_SIZE
  const categories = categoriesRes.data?.categories ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <ListingView
        items={items}
        total={total}
        page={responsePage}
        pageSize={responsePageSize}
        q={q ?? ""}
        verified={verified}
        currentCategory={category}
        categories={categories}
      />
    </div>
  )
}
