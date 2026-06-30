// /account/posts — the author's own posts, regardless of status.
//
// RSC. Server-fetches the list via apiServerFetch so first paint is
// immediate; the client component (MyPostsList) takes over for the
// edit/delete actions.

import type { Metadata } from "next"
import { Suspense } from "react"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { apiServerFetch } from "@aira/api/server"
import { requireUser } from "@/lib/auth/server"
import { listMyCommunityPostsOp } from "@/server/operations/community"
import { MyPostsList } from "@/features/community"

export const metadata: Metadata = {
  title: "My posts",
}
export const dynamic = "force-dynamic"

export default async function MyPostsPage() {
  await requireUser()

  const res = await apiServerFetch(listMyCommunityPostsOp, { input: {} })
  const initialItems = res.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Account
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">
          My posts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit or delete any post you&rsquo;ve shared with the community.
          Editing an approved post sends it back for re-moderation.
        </p>
      </header>

      {/* MyPostsList reads searchParams via the App Router hook, so wrap
          in <Suspense> per the Next 16 useSearchParams contract. */}
      <Suspense>
        <MyPostsList initialItems={initialItems} />
      </Suspense>
    </div>
  )
}
