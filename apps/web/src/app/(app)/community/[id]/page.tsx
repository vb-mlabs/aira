// /community/[id] — single community post.
//
// RSC. Fetches the post via apiServerFetch and (only when the viewer is
// the author) the list of "I'm interested" respondents. Non-authors see
// the post + a public count; the named respondent list never leaves the
// API for them.

import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { buttonVariants } from "@aira/ui-web/button"
import { requireUser } from "@/lib/auth/server"
import {
  getCommunityPostOp,
  listInterestsOp,
} from "@/server/operations/community"
import { CommentThread, PostCardReadOnly } from "@/features/community"
import type { InterestRow } from "@/features/community"

export const dynamic = "force-dynamic"

interface CommunityPostPageProps {
  params: Promise<{ id: string }>
}

export default async function CommunityPostPage({
  params,
}: CommunityPostPageProps) {
  const { id } = await params
  const user = await requireUser()

  const res = await apiServerFetch(getCommunityPostOp, {
    input: { id },
    pathParams: { id },
  })

  const post = res.data?.post ?? null
  const isAuthor = res.data?.is_author ?? false

  if (!post) {
    notFound()
  }

  let interests: InterestRow[] = []
  if (isAuthor) {
    const interestRes = await apiServerFetch(listInterestsOp, {
      input: { id },
      pathParams: { id },
    })
    interests = interestRes.data?.items ?? []
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/community"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to community
      </Link>

      <div className="mt-4">
        <PostCardReadOnly post={post} />
      </div>

      {isAuthor ? (
        <section
          aria-labelledby="respondents-heading"
          className="mt-6 rounded-xl bg-card px-6 py-7 shadow-[var(--shadow-card)] sm:px-8"
        >
          <div className="flex items-baseline gap-3">
            <h2 id="respondents-heading" className="font-display text-2xl">
              Neighbours who are interested
            </h2>
            <span className="text-xs text-muted-foreground">
              {interests.length === 0
                ? "no one yet"
                : `${interests.length} · only you can see this`}
            </span>
          </div>

          {interests.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              When someone taps “I’m interested”, you’ll see their name and any
              note they leave right here.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {interests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg bg-background/40 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                    >
                      {initialsOf(r.responder_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight">
                        {r.responder_name}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {relativeTime(r.created_at)}
                      </p>
                    </div>
                  </div>
                  {r.message ? (
                    <p className="mt-3 text-sm leading-relaxed">{r.message}</p>
                  ) : (
                    <p className="mt-3 text-sm italic text-muted-foreground">
                      No note attached — just letting you know they&rsquo;re interested.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null /* Non-author count is shown next to InterestButton on the
                  PostCard above; a second paragraph here duplicated it AND
                  went stale until the next navigation because router.refresh()
                  doesn't always reconcile the page-level closure during the
                  same tick. Source of truth: the button's own local count. */}

      <div className="mt-6">
        <CommentThread
          postId={post.id}
          acceptsComments={post.status === "approved"}
          currentUserId={user.id}
        />
      </div>

      <div className="mt-8">
        <Link
          href="/community"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to community
        </Link>
      </div>
    </div>
  )
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
  return initials || "?"
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
