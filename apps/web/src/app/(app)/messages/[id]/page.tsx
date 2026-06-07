// /messages/[id] — thread. Auth + participant check happen in the op
// handler (which calls the same service methods that the service-direct
// route uses). On non-participant or missing convo, the service throws
// ApiError("messages.not_found"); apiServerFetch surfaces that as a thrown
// ApiError here and we 404 — no enumeration of "wrong conv" vs "not in it".

import { notFound } from "next/navigation"
import { apiServerFetch } from "@aira/api/server"
import { ApiError } from "@aira/api"
import {
  listMessagesOp,
  getOtherParticipantOp,
} from "@/server/operations/messages"
import { getCallerContext } from "@/lib/auth/server"
import { Thread } from "@/features/messages"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ThreadPage({ params }: PageProps) {
  // ctx is needed for `meId` in the Thread component. The op layer
  // independently verifies caller identity + participant membership.
  const ctx = await getCallerContext()
  const { id: conversationId } = await params

  let initialMessages
  try {
    const res = await apiServerFetch(listMessagesOp, {
      input: { id: conversationId },
      pathParams: { id: conversationId },
    })
    initialMessages = res.data?.items ?? []
  } catch (err) {
    if (err instanceof ApiError && err.code === "messages.not_found") {
      notFound()
    }
    throw err
  }

  const otherRes = await apiServerFetch(getOtherParticipantOp, {
    input: { id: conversationId },
    pathParams: { id: conversationId },
  })
  const otherUser = otherRes.data?.otherUser ?? null

  return (
    <Thread
      conversationId={conversationId}
      meId={ctx.userId}
      otherUser={otherUser}
      initialMessages={initialMessages}
    />
  )
}
