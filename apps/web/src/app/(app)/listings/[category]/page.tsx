import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCategoryMeta } from "@/features/listings/category-meta"
import { ListingView } from "@/features/listings/components/listing-view"
import { PrimaryCategoryView } from "@/features/listings/components/primary-category-view"
import { apiServerFetch } from "@aira/api/server"
import { getSession } from "@/lib/auth/server"
import { listBusinessesOp } from "@/server/operations/businesses"
import {
  getCategoryBySlugOp,
  listCategoriesOp,
  listCategoriesRootsOp,
} from "@/server/operations/categories"
import { listMyFavoriteIdsOp } from "@/server/operations/favorites"

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

  const catRes = await apiServerFetch(getCategoryBySlugOp, {
    input: { slug: category },
  })
  if (!catRes.data?.category) notFound()
  const cat = catRes.data.category

  const session = await getSession()
  const isSignedIn = !!session

  // Level-1 (root/primary): render the PrimaryCategoryView — name + subs +
  // 5 featured. No paginated listing, no search, no verified filter. The
  // subcategory drill-down (level-2) keeps the existing ListingView.
  if (cat.level === 1) {
    const [rootsRes, featuredRes, favIdsRes] = await Promise.all([
      apiServerFetch(listCategoriesRootsOp, { input: {} }),
      apiServerFetch(listBusinessesOp, {
        input: { featured: true, category, limit: 5 },
      }),
      isSignedIn
        ? apiServerFetch(listMyFavoriteIdsOp, { input: {} })
        : Promise.resolve(null),
    ])

    const subs = rootsRes.data?.subsByRoot?.[cat.id] ?? []
    const counts = rootsRes.data?.counts ?? {}
    const featured = featuredRes.data?.items ?? []
    const favIds = favIdsRes?.data?.ids ?? []

    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
        <PrimaryCategoryView
          category={cat}
          subs={subs}
          counts={counts}
          featured={featured}
          isSignedIn={isSignedIn}
          favIds={favIds}
        />
      </div>
    )
  }

  // Level-2 (subcategory): existing paginated ListingView with search +
  // verified filter + subcategory picker.
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const parsedPage = Number.parseInt(sp.page ?? "", 10)
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1
  const verified = sp.verified === "1" || sp.verified === "true"

  const [res, categoriesRes, favIdsRes] = await Promise.all([
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
    isSignedIn
      ? apiServerFetch(listMyFavoriteIdsOp, { input: {} })
      : Promise.resolve(null),
  ])

  const items = res.data?.items ?? []
  const total = res.data?.total ?? 0
  const responsePage = res.data?.page ?? page
  const responsePageSize = res.data?.pageSize ?? PAGE_SIZE
  const categories = categoriesRes.data?.categories ?? []
  const favIds = favIdsRes?.data?.ids ?? []

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
        isSignedIn={isSignedIn}
        favIds={favIds}
      />
    </div>
  )
}
