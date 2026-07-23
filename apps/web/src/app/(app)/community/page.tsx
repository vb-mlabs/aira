// /community — F20 Community Requests Board.
//
// RSC. Server-fetches the first page of approved posts via apiServerFetch
// so the first paint is immediate. The PostList client component then takes
// over for search + pagination.

import { brand } from "@aira/config"
import { apiServerFetch } from "@aira/api/server"
import { requireUser } from "@/lib/auth/server"
import {
  getMyCommunityPostLimitsOp,
  listCommunityPostsOp,
} from "@/server/operations/community"
import { PostForm, PostList } from "@/features/community"
import { MAX_ACTIVE_POSTS_PER_USER } from "@aira/validators/community"

export const metadata = { title: "Community" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 10

export default async function CommunityPage() {
  const user = await requireUser()

  const [postsRes, limitsRes] = await Promise.all([
    apiServerFetch(listCommunityPostsOp, {
      input: { page: 1, pageSize: PAGE_SIZE },
    }),
    apiServerFetch(getMyCommunityPostLimitsOp, { input: {} }),
  ])

  const initial = postsRes.data ?? {
    items: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  }

  // If the limits fetch fails (network / auth hiccup) treat as "unknown,
  // allow the composer to open" — the createPost 409 remains the source
  // of truth. `remaining` undefined skips the cap-reached branch in
  // PostForm and preserves reactive behaviour.
  const remaining = limitsRes.data?.remaining ?? MAX_ACTIVE_POSTS_PER_USER

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <section className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Community Posts
        </p>
        <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          Post on {brand.name}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-foreground/80 sm:text-base">
          Post a request for something you need — services, recommendations,
          items, or local help.
        </p>
        <div className="mt-6 flex justify-center">
          <PostForm remaining={remaining} />
        </div>
      </section>

      <section className="mt-10">
        <PostList initial={initial} currentUserId={user.id} />
      </section>
    </div>
  )
}
