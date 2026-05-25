"use client"

import { DataList, EmptyState } from "@/lib/ui"
import { usePolledFetch } from "@/lib/hooks/use-polled-fetch"
import type { ConversationListItem } from "@/features/messages/types"
import { ConversationRow } from "./conversation-row"

const INBOX_POLL_MS = 10_000

interface ConversationsListProps {
  initialItems: ConversationListItem[]
}

// Inbox listing. Hydrates from the server-rendered initialItems on first
// paint, then polls every 10s (visibility-gated by usePolledFetch). No
// loading skeleton on subsequent fetches — we already have data to show.
export function ConversationsList({ initialItems }: ConversationsListProps) {
  const { data } = usePolledFetch<{ items: ConversationListItem[] }>({
    url: "/api/v1/messages/conversations",
    intervalMs: INBOX_POLL_MS,
  })
  const items = data?.items ?? initialItems

  return (
    <DataList
      data={items}
      loading={false}
      error={null}
      keyExtractor={(c) => c.id}
      empty={
        <EmptyState
          title="No conversations yet"
          description="Start a DM with someone using the form above."
        />
      }
      renderItem={(item) => <ConversationRow item={item} />}
    />
  )
}
