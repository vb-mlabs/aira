// /admin/community/[id] — F20 v2 detail page.
//
// Full body, rejected reason, respondent list (admin variant — sees every
// name + message), and all four action buttons with their confirmation
// flows. The list page at /admin/community is now a pure table; rich
// state changes happen here.

import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { buttonVariants } from "@aira/ui-web/button"
import {
  adminGetCommunityPostOp,
  adminListInterestsOp,
} from "@/server/operations/community"
import { PostDetailActions } from "@/features/admin/community/post-detail-actions"
import { AdminPageHeader } from "../../_components/page-header"

export const metadata = { title: "Admin · Community · Request" }
export const dynamic = "force-dynamic"

interface AdminCommunityDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCommunityDetailPage({
  params,
}: AdminCommunityDetailPageProps) {
  const { id } = await params

  const [postRes, interestsRes] = await Promise.all([
    apiServerFetch(adminGetCommunityPostOp, { input: { id }, pathParams: { id } }),
    apiServerFetch(adminListInterestsOp, { input: { id }, pathParams: { id } }),
  ])

  const post = postRes.data?.post ?? null
  if (!post) notFound()

  const interests = interestsRes.data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/community"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to requests
        </Link>
      </div>

      <AdminPageHeader
        title="Request"
        subtitle={`Submitted ${formatDateTime(post.created_at)} · ${statusSentence(post.status)}`}
      />

      <PostDetailActions post={post} />

      <article className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-bold">{post.author_name}</p>
          {post.author_email && (
            <p className="text-xs text-muted-foreground">· {post.author_email}</p>
          )}
        </header>

        <h2 className="mt-4 font-display text-2xl leading-tight">{post.title}</h2>

        {post.body && (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
            {post.body}
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs sm:grid-cols-4">
          <Cell label="Status" value={post.status} />
          <Cell
            label="Expires"
            value={post.expires_at ? formatDate(post.expires_at) : "—"}
          />
          <Cell label="Helpers" value={String(post.interest_count)} />
          <Cell
            label="Approved"
            value={post.approved_at ? formatDate(post.approved_at) : "—"}
          />
        </dl>

        {post.rejected_reason && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-foreground">
            <span className="font-medium">Rejected reason: </span>
            {post.rejected_reason}
          </p>
        )}
      </article>

      <section className="rounded-xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <header className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-lg">
            {interests.length === 0
              ? "No one has offered to help yet"
              : interests.length === 1
                ? "1 neighbour offered to help"
                : `${interests.length} neighbours offered to help`}
          </h2>
        </header>

        {interests.length > 0 && (
          <ul className="mt-4 space-y-3">
            {interests.map((r) => (
              <li
                key={r.id}
                className="rounded-md bg-background/40 px-4 py-3"
              >
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-bold leading-tight">
                    {r.responder_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    · {formatDateTime(r.created_at)}
                  </p>
                </div>
                {r.message ? (
                  <p className="mt-1 text-sm leading-relaxed">{r.message}</p>
                ) : (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    No note attached.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <Link
          href="/admin/community"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to requests
        </Link>
      </div>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}

function statusSentence(status: string): string {
  switch (status) {
    case "pending":
      return "awaiting moderation"
    case "approved":
      return "live on the board"
    case "expired":
      return "past expiry"
    case "rejected":
      return "rejected"
    default:
      return status
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const min = String(d.getUTCMinutes()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()} ${hh}:${min} UTC`
}
