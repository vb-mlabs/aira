// /listings/[category]/[id] — single business detail. The [category]
// segment is informational (used by the BusinessDetail back link); the
// id alone is enough to resolve the row. Mismatched category → still
// renders, BusinessDetail's back chevron just points at the user-clicked
// category instead of the canonical one. Cheap, harmless.

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BusinessDetail } from "@/features/listings"
// Direct service import — temporary bridge between T5/T7 (see T7 commit).
import { businesses } from "@aira/services"
import { db } from "@/lib/db"

interface PageProps {
  params: Promise<{ category: string; id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const business = await businesses.getBusinessById(db, id)
  return { title: business?.name ?? "Not found" }
}

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params
  const business = await businesses.getBusinessById(db, id)
  if (!business) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <BusinessDetail business={business} />
    </div>
  )
}
