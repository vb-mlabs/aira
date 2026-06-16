import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoryMeta } from "@/features/listings/category-meta"
import { ListingView } from "@/features/listings/components/listing-view"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import { getCategoryBySlugOp } from "@/server/operations/categories"

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

  const catRes = await apiServerFetch(getCategoryBySlugOp, { input: { slug: category } })
  if (!catRes.data?.category) notFound()

  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const parsedPage = Number.parseInt(sp.page ?? "", 10)
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1
  const verified = sp.verified === "1" || sp.verified === "true"

  const res = await apiServerFetch(listBusinessesOp, {
    input: {
      category,
      q,
      page,
      pageSize: PAGE_SIZE,
      verified: verified || undefined,
    },
  })

  const items = res.data?.items ?? []
  const total = res.data?.total ?? 0
  const responsePage = res.data?.page ?? page
  const responsePageSize = res.data?.pageSize ?? PAGE_SIZE

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
      />
    </div>
  )
}
