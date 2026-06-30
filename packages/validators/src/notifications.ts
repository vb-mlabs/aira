// Notifications — public shape over the wire. Mirrors the @aira/db
// NotificationBody discriminated union with string-typed dates (vs Date
// inside the service); web RSC + Client Components + mobile all read this
// shape.
//
// To add a notification variant: add the kind to NotificationBodySchema +
// to @aira/db/types NotificationBody, then add a renderer branch in
// features/notifications/components/notification-item.tsx.

import { z } from "zod";

export const NotificationBodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("generic"),
    title: z.string(),
    message: z.string(),
    href: z.string().optional(),
  }),
  z.object({
    kind: z.literal("message"),
    conversation_id: z.string(),
    sender_id: z.string(),
    sender_name: z.string(),
    preview: z.string(),
  }),
  z.object({
    kind: z.literal("post_interest"),
    post_id: z.string(),
    post_title: z.string(),
    responder_id: z.string(),
    responder_name: z.string(),
    message: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("post_comment"),
    post_id: z.string(),
    post_title: z.string(),
    commenter_id: z.string(),
    commenter_name: z.string(),
    body_preview: z.string(),
    is_reply: z.boolean(),
  }),
  z.object({
    kind: z.literal("business_broadcast"),
    title: z.string(),
    message: z.string(),
  }),
]);
export type NotificationBodyPublic = z.infer<typeof NotificationBodySchema>;

export const NotificationRowSchema = z.object({
  id: z.string(),
  type: z.string(),
  body: NotificationBodySchema,
  /** ISO 8601 — null when unread. */
  read_at: z.string().nullable(),
  /** ISO 8601 */
  created_at: z.string(),
});
export type NotificationRow = z.infer<typeof NotificationRowSchema>;

export const ListInboxInputSchema = z.object({}).strict();
export type ListInboxInput = z.infer<typeof ListInboxInputSchema>;

export const ListInboxOutputSchema = z.object({
  items: z.array(NotificationRowSchema),
});
export type ListInboxOutput = z.infer<typeof ListInboxOutputSchema>;

export const MarkReadInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type MarkReadInput = z.infer<typeof MarkReadInputSchema>;

export const MarkResultSchema = z.object({
  ok: z.literal(true),
  changed: z.number().int().nonnegative(),
});
export type MarkResult = z.infer<typeof MarkResultSchema>;
