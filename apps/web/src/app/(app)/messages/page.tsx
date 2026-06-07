// /messages — inbox. Server-renders the first page of conversations via
// apiServerFetch; the polling Client Component then re-fetches every 10s
// against the service-direct /api/v1/messages/conversations route (which
// keeps the If-Modified-Since 304 short-circuit).

import { apiServerFetch } from "@aira/api/server"
import { listConversationsOp } from "@/server/operations/messages"
import {
  ConversationsList,
  NewConversationForm,
} from "@/features/messages"

export const metadata = { title: "Messages" }
export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const res = await apiServerFetch(listConversationsOp, { input: {} })
  const items = res.data?.items ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct messages, newest first.
        </p>
      </header>
      <NewConversationForm />
      <ConversationsList initialItems={items} />
    </div>
  )
}
