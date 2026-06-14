// /community — F20 Community Requests Board.
//
// RSC. Server-fetches the first page of approved posts via apiServerFetch
// so the first paint is immediate. The PostList client component then takes
// over for search + pagination.

import { apiServerFetch } from "@aira/api/server"
import { requireUser } from "@/lib/auth/server"
import { listCommunityPostsOp } from "@/server/operations/community"
import { PostForm, PostList } from "@/features/community"

export const metadata = { title: "Community" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 10

export default async function CommunityPage() {
  const user = await requireUser()

  const res = await apiServerFetch(listCommunityPostsOp, {
    input: { page: 1, pageSize: PAGE_SIZE },
  })

  const initial = res.data ?? {
    items: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="rounded-xl bg-card px-6 py-8 text-center shadow-[var(--shadow-card)] sm:px-10 sm:py-12">
        <p className="text-[11px] font-bold uppercase tracking-[4px] text-foreground">
          Community Requests
        </p>
        <h1 className="mx-auto mt-5 max-w-xl font-display text-3xl leading-tight sm:text-5xl">
          Real people. Real asks.{" "}
          <em className="block not-italic font-semibold text-primary">
            Trusted leads.
          </em>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Ask the community for a referral — a doctor, a teacher, a contractor —
          and let neighbours close the loop with someone they actually know.
        </p>
        <div className="mt-6 flex justify-center">
          <PostForm />
        </div>
      </header>

      <section className="mt-8">
        <PostList initial={initial} currentUserId={user.id} />
      </section>
    </div>
  )
}
