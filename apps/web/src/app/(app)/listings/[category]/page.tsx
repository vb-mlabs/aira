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

interface PageProps {
  params: Promise<{ category: string }>
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

export default async function CategoryListingPage({ params }: PageProps) {
  const { category } = await params
  if (!isValidCategory(category)) notFound()

  const res = await apiServerFetch(listBusinessesOp, { input: { category } })
  const businesses = res.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <ListingView businesses={businesses} currentCategory={category} />
    </div>
  )
}
