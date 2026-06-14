// Compact community post card — matches the listing card density so the
// /community feed and /listings/<category> share one visual rhythm. The
// whole card is the link target via the ::after overlay technique;
// InterestButton sits at z-10 so its hitbox wins over the overlay.

import Link from "next/link"
import type { PostRow } from "../types"
import { InterestButton } from "./interest-button"

interface PostCardProps {
  post: PostRow
  /** Current session user id, when known. Used to suppress "I can help"
   *  on a post the viewer authored. */
  currentUserId?: string | null
  /** Whether the current session has already offered to help on this post.
   *  Defaults to false; the parent passes the truthful value when it has
   *  pre-fetched interests data. */
  alreadyHelped?: boolean
  /** When true (default), wraps the title in a card-spanning link to the
   *  detail page. The card on the detail page itself sets this to false. */
  linkToDetail?: boolean
}

export function PostCard({
  post,
  currentUserId = null,
  alreadyHelped = false,
  linkToDetail = true,
}: PostCardProps) {
  const isAuthor = currentUserId !== null && currentUserId === post.user_id

  return (
    <article className="relative flex items-start gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
      >
        {initialsOf(post.author_name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {linkToDetail ? (
            <Link
              href={`/community/${post.id}`}
              className="font-display text-lg leading-tight text-foreground line-clamp-1 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
            >
              {post.title}
            </Link>
          ) : (
            <h2 className="font-display text-lg leading-tight text-foreground line-clamp-1">
              {post.title}
            </h2>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {post.author_name} · <span suppressHydrationWarning>{relativeTime(post.created_at)}</span>
        </p>
        {post.body && (
          <p className="mt-1 line-clamp-1 text-xs leading-snug text-foreground/85">
            {post.body}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
        <StatusPill status={post.status} />
        {isAuthor ? (
          <p className="text-[11px] text-muted-foreground">
            {post.interest_count === 0
              ? "No offers yet"
              : post.interest_count === 1
                ? "1 helper"
                : `${post.interest_count} helpers`}
          </p>
        ) : (
          <div className="relative z-10">
            <InterestButton
              postId={post.id}
              initialActive={alreadyHelped}
              initialCount={post.interest_count}
              showCount={false}
            />
          </div>
        )}
      </div>
    </article>
  )
}

function StatusPill({ status }: { status: PostRow["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        <span aria-hidden className="size-1 rounded-full bg-primary" />
        Open
      </span>
    )
  }
  if (status === "expired") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Closed
      </span>
    )
  }
  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
      Not approved
    </span>
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
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  const dt = new Date(iso)
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(dt.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${dt.getUTCFullYear()}`
}
