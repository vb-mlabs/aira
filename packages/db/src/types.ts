// Typed payload shapes for jsonb columns. Co-located with the db package so
// schema files can reference them without depending on app code.

// Notification body shape — discriminated union, NOT free-form jsonb.
// Same justification as AuditMeta (./audit.ts): a typed allowlist keeps body
// queryable and makes anonymize-on-delete safe (PII can only live in known
// fields).
//
// Adding a new variant:
//   1. Add it to NotificationBody below.
//   2. Add a renderer branch in NotificationItem.
//   3. The kind string is the discriminator — also stored on the row's `type`
//      column for SQL filtering ("show me all comment_reply notifications").
export type NotificationBody =
  | {
      kind: "generic"
      title: string
      message: string
      /** Optional href the row links to. Internal routes only — validate in the
       *  creator. Never accept user input here without checking the origin. */
      href?: string
    }
  | {
      kind: "message"
      /** Conversation the message belongs to. Drives the cascade in
       *  features/messages/server/messages.ts → markConversationRead, which
       *  marks every notification of this kind+conversation_id as read when
       *  the recipient opens the thread. */
      conversation_id: string
      sender_id: string
      sender_name: string
      /** Truncated preview (≤200 chars). The thread is the source of truth
       *  for the full body — this is just enough for the bell drop-down. */
      preview: string
    }
  | {
      kind: "post_interest"
      /** Community post the responder offered to help with. The notification
       *  links to /community/<post_id>; the renderer must check the post is
       *  still readable before showing the link (cascade-delete leaves
       *  orphans). */
      post_id: string
      /** Denormalised post title so the renderer doesn't need a join. */
      post_title: string
      responder_id: string
      responder_name: string
      /** Optional short note (≤300 chars). null when the responder just
       *  tapped "I can help" without typing anything. */
      message: string | null
    }

export type NotificationKind = NotificationBody["kind"]
