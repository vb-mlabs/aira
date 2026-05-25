// Shared types for features/messages — used by server + UI to avoid drift
// between query result shape and component props.

export interface ConversationListItem {
  id: string
  /** The user on the other side of this 1:1 (or any-other if group v2). */
  other_user: {
    id: string
    name: string
    image: string | null
  }
  last_message_preview: string | null
  last_message_at: string | null
  /** Count of messages strictly after my last_read_at, excluding my own sends. */
  unread_count: number
}

export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_name: string
  body: string
  created_at: string
}

/** Cursor used by `GET /api/messages/.../messages?after=<cursor>`.
 *  Composite (created_at, id) so same-millisecond inserts still page
 *  deterministically. Encoded as base64 JSON in the wire format. */
export interface MessageCursor {
  created_at: string
  id: string
}

export const MAX_BODY_CHARS = 10_000
