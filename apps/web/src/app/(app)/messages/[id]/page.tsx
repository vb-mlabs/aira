// /messages/[id] — thread. Auth + participant check happen server-side via
// messages.listMessages → _requireParticipant. On non-participant or missing
// convo, the service throws ApiError("messages.not_found") and we 404 — no
// enumeration of "wrong conv" vs "not in it".

import { notFound } from "next/navigation"
import { messages } from "@mlabs/services"
import { ApiError } from "@mlabs/api"
import { db } from "@/lib/db"
import { getCallerContext } from "@/lib/auth/server"
import { Thread } from "@/features/messages"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ThreadPage({ params }: PageProps) {
  const ctx = await getCallerContext()
  const { id: conversationId } = await params

  let initialMessages
  try {
    const { items } = await messages.listMessages(db, ctx, { conversationId })
    initialMessages = items
  } catch (err) {
    if (err instanceof ApiError && err.code === "messages.not_found") {
      notFound()
    }
    throw err
  }

  const { otherUser } = await messages.getOtherParticipant(db, ctx, {
    conversationId,
  })

  return (
    <Thread
      conversationId={conversationId}
      meId={ctx.userId}
      otherUser={otherUser}
      initialMessages={initialMessages}
    />
  )
}
