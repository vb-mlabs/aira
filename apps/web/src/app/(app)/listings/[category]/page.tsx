import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  CATEGORY_META,
  VALID_CATEGORIES,
  type BusinessCategory,
} from "@/features/listings"
import { ListingView } from "@/features/listings/components/listing-view"
import { apiServerFetch } from "@aira/api/server"
import { listBusinessesOp } from "@/server/operations/businesses"

const PAGE_SIZE = 12

interface PageProps {
  params: Promise<{ category: string }>
  searchParams: Promise<{
    q?: string
    page?: string
    verified?: string
  }>
}

function isValidCategory(value: string): value is BusinessCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value)
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params
  if (!isValidCategory(category)) return { title: "Not found" }
  return { title: CATEGORY_META[category].displayName }
}

export default async function CategoryListingPage({
  params,
  searchParams,
}: PageProps) {
  const { category } = await params
  if (!isValidCategory(category)) notFound()

  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  // Coerce ?page= manually. Anything non-numeric or < 1 falls back to 1
  // silently (the Zod schema would clamp at the API layer too, but doing
  // it here means the URL we render in the page header is always sane).
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
