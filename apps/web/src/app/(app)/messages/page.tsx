// /messages — inbox. Server-renders the first page of conversations, then
// the client component polls every 10s for updates.

import { messages } from "@mlabs/services"
import { db } from "@/lib/db"
import { getCallerContext } from "@/lib/auth/server"
import {
  ConversationsList,
  NewConversationForm,
} from "@/features/messages"

export const metadata = { title: "Messages" }
export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const ctx = await getCallerContext()
  const { items } = await messages.listConversations(db, ctx)

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
