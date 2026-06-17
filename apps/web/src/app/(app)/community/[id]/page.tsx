// /community/[id] — single community post.
//
// RSC. Fetches the post via apiServerFetch and renders the comment
// thread below. The legacy "I'm interested" affordance + the author-
// only respondent list were removed; comments are the only engagement
// signal now.

import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { apiServerFetch } from "@aira/api/server"
import { buttonVariants } from "@aira/ui-web/button"
import { requireUser } from "@/lib/auth/server"
import { getCommunityPostOp } from "@/server/operations/community"
import { CommentThread, PostCardReadOnly } from "@/features/community"

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
  if (!post) {
    notFound()
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

      <div className="mt-6 rounded-xl bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
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
