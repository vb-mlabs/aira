// Admin console — shared shapes between web RSC, web Client Components,
// mobile (future), and the /api/v1/admin/* route handlers.
//
// "UserRole" here is the admin-UI toggle surface (end_user | admin); the
// full DB enum also includes super_admin, which the listings + detail
// queries bucket under "admin" for display. super_admin promotion is
// bootstrap-env-only today; surfacing it as a flippable role would risk
// accidental demotion. See packages/db/src/schema/auth.ts.

import { z } from "zod";

import {
  KnownAuditActionSchema,
  KnownAuditTargetTypeSchema,
} from "./audit-meta";

export const ADMIN_PAGE_SIZE = 50;
export const ADMIN_AUDIT_PAGE_SIZE = 100;

export const UserRoleSchema = z.enum(["end_user", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AdminUserRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
  image: z.string().nullable(),
  role: UserRoleSchema,
  banned_at: z.string().nullable(),
  banned_reason: z.string().nullable(),
  created_at: z.string(),
});
export type AdminUserRow = z.infer<typeof AdminUserRowSchema>;

export const AdminAuditRowSchema = z.object({
  id: z.string(),
  actor_id: z.string().nullable(),
  actor_email: z.string().nullable(),
  action: z.string(),
  target_type: z.string().nullable(),
  target_id: z.string().nullable(),
  /** Resolved via LEFT JOINs on business_subscription + sponsorship in
   *  listAudit. Non-null when target_type is business_subscription or
   *  sponsorship (and the underlying row still exists); null
   *  otherwise. Drives the per-row link in renderAuditTarget so a
   *  subscription audit entry can point at the parent /admin/businesses
   *  page rather than just a UUID. */
  target_business_id: z.string().nullable(),
  metadata: z.unknown(),
  at: z.string(),
});
export type AdminAuditRow = z.infer<typeof AdminAuditRowSchema>;

export const AdminUsersFiltersSchema = z
  .object({
    q: z.string().optional(),
    role: z.union([UserRoleSchema, z.literal("all")]).optional(),
    banned: z.enum(["all", "banned", "active"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
  })
  .strict();
export type AdminUsersFilters = z.infer<typeof AdminUsersFiltersSchema>;

export const ListUsersOutputSchema = z.object({
  items: z.array(AdminUserRowSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type ListUsersOutput = z.infer<typeof ListUsersOutputSchema>;

export const UserDetailInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type UserDetailInput = z.infer<typeof UserDetailInputSchema>;

export const UserDetailOutputSchema = z.object({
  user: AdminUserRowSchema.nullable(),
  audit: z.array(AdminAuditRowSchema),
});
export type UserDetailOutput = z.infer<typeof UserDetailOutputSchema>;

export const ListAuditInputSchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    /** ISO 8601 — inclusive. */
    since: z.string().optional(),
    /** ISO 8601 — exclusive. */
    until: z.string().optional(),
    /** user.id — exact match on audit_log.actor_id. */
    actor_id: z.string().optional(),
    /** Closed enum — one of KNOWN_AUDIT_TARGET_TYPES. */
    target_type: KnownAuditTargetTypeSchema.optional(),
    /** Closed enum — one of KNOWN_AUDIT_ACTIONS (the discriminated
     *  union's kind values). */
    action: KnownAuditActionSchema.optional(),
  })
  .strict();
export type ListAuditInput = z.infer<typeof ListAuditInputSchema>;

export const ListAuditOutputSchema = z.object({
  items: z.array(AdminAuditRowSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type ListAuditOutput = z.infer<typeof ListAuditOutputSchema>;

/** F21 — Audience preview op input/output. The admin modal hits the
 *  preview op while the audience picker is open and debounces the radio
 *  / multi-select choices so the recipient count is visible before the
 *  admin commits. */
export const PreviewBroadcastRecipientCountInputSchema = z
  .object({
    target: z.lazy(() => BroadcastTargetSchema),
  })
  .strict();
export type PreviewBroadcastRecipientCountInput = z.infer<
  typeof PreviewBroadcastRecipientCountInputSchema
>;

export const PreviewBroadcastRecipientCountOutputSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type PreviewBroadcastRecipientCountOutput = z.infer<
  typeof PreviewBroadcastRecipientCountOutputSchema
>;

/** F21 — Audience picker for the owner broadcast modal. Existing G1
 *  "all linked owners" path stays the default; the three new branches add
 *  optional narrowing. All branches inherit the active-only business
 *  filter (deleted_at IS NULL) at the service layer per F21 review
 *  decision 4. */
export const BroadcastTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all_linked_owners") }).strict(),
  z
    .object({ kind: z.literal("by_city"), city_id: z.string().min(1) })
    .strict(),
  z
    .object({
      kind: z.literal("by_categories"),
      category_ids: z.array(z.string().min(1)).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("by_businesses"),
      business_ids: z.array(z.string().min(1)).min(1),
    })
    .strict(),
]);
export type BroadcastTarget = z.infer<typeof BroadcastTargetSchema>;

/** G1 — Notify all linked business owners. title bounds keep the bell
 *  drop-down legible (≤120 chars), message bounds the body without being
 *  artificially short (2000 chars covers any realistic announcement).
 *  F21 added `target` with a default so the existing one-click "all
 *  owners" flow stays binary-compatible at the modal call-site. */
export const BusinessOwnerBroadcastInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(2000),
    target: BroadcastTargetSchema.default({ kind: "all_linked_owners" }),
  })
  .strict();
export type BusinessOwnerBroadcastInput = z.infer<
  typeof BusinessOwnerBroadcastInputSchema
>;

export const BusinessOwnerBroadcastOutputSchema = z.object({
  ok: z.literal(true),
  /** Number of recipients targeted by the targeting query. 0 is legal —
   *  no notifications written, but the audit row is still persisted so the
   *  attempt leaves a trace. */
  recipient_count: z.number().int().nonnegative(),
  /** F21 — total devices across resolved recipients that we attempted to
   *  push to. <= sum of registered devices per user. */
  devices_attempted: z.number().int().nonnegative(),
  /** F21 — devices the Expo Push Service accepted a ticket for before the
   *  60s AbortController fired. */
  devices_completed: z.number().int().nonnegative(),
  /** F21 — devices still in-flight when the 60s cap fired. The receipt
   *  follow-up plan will reconcile these. */
  devices_pending: z.number().int().nonnegative(),
});
export type BusinessOwnerBroadcastOutput = z.infer<
  typeof BusinessOwnerBroadcastOutputSchema
>;

// ─── Admin user-direct broadcast (with per-platform diagnostics) ──────────
//
// Sibling to BusinessOwnerBroadcast but targets `user_device` rows
// directly instead of joining through `businesses`. Powers the
// /admin/users "Notify users" tool, whose primary use is debugging
// iOS push delivery — the by_platform branch lets an admin send an
// iOS-only test blast and read back per-platform ticket outcomes to
// distinguish send-side vs receive-side failures.
//
// Deliberately a NEW discriminated union rather than a branch on
// BroadcastTargetSchema — the owner target's shape (by_city,
// by_categories, by_businesses) is business-scoped and doesn't
// compose with user-scoped narrowing.

export const UserBroadcastTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all_users_with_device") }).strict(),
  z
    .object({
      kind: z.literal("by_platform"),
      platform: z.enum(["ios", "android"]),
    })
    .strict(),
]);
export type UserBroadcastTarget = z.infer<typeof UserBroadcastTargetSchema>;

export const SendUserBroadcastInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(2000),
    target: UserBroadcastTargetSchema,
  })
  .strict();
export type SendUserBroadcastInput = z.infer<
  typeof SendUserBroadcastInputSchema
>;

/** Per-platform push counters. iOS + Android bucketed independently
 *  so admins can see "24 iOS delivered, 12 iOS not-registered, 40
 *  Android delivered" at a glance — exactly the split needed to
 *  triage platform-specific delivery issues. */
export const UserBroadcastPlatformCountsSchema = z.object({
  devices_attempted: z.number().int().nonnegative(),
  devices_completed: z.number().int().nonnegative(),
  devices_pending: z.number().int().nonnegative(),
});
export type UserBroadcastPlatformCounts = z.infer<
  typeof UserBroadcastPlatformCountsSchema
>;

export const SendUserBroadcastOutputSchema = z.object({
  ok: z.literal(true),
  /** Distinct users matched by the audience. 0 is legal — audit row
   *  still written for the attempt trace. */
  recipient_count: z.number().int().nonnegative(),
  by_platform: z.object({
    ios: UserBroadcastPlatformCountsSchema,
    android: UserBroadcastPlatformCountsSchema,
  }),
  /** Map of Expo ticket error codes to occurrence counts. Empty when
   *  every attempted device got an OK ticket. Keys are Expo's error
   *  strings (DeviceNotRegistered, MessageTooBig, MismatchSenderId,
   *  InvalidCredentials, ...) — kept as an open map rather than a
   *  fixed enum because Expo may introduce new codes over time. */
  error_code_counts: z.record(z.string(), z.number().int().nonnegative()),
});
export type SendUserBroadcastOutput = z.infer<
  typeof SendUserBroadcastOutputSchema
>;

export const PreviewUserBroadcastInputSchema = z
  .object({ target: UserBroadcastTargetSchema })
  .strict();
export type PreviewUserBroadcastInput = z.infer<
  typeof PreviewUserBroadcastInputSchema
>;

/** Preview payload — surfaced in the compose step so the admin knows
 *  the scope of the audience BEFORE they hit Send. by_platform mirrors
 *  the Send-step output so the compose-step and Sent-step shapes read
 *  identically in the UI. */
export const UserBroadcastPlatformPreviewSchema = z.object({
  users: z.number().int().nonnegative(),
  devices: z.number().int().nonnegative(),
});
export type UserBroadcastPlatformPreview = z.infer<
  typeof UserBroadcastPlatformPreviewSchema
>;

export const PreviewUserBroadcastOutputSchema = z.object({
  user_count: z.number().int().nonnegative(),
  device_count: z.number().int().nonnegative(),
  by_platform: z.object({
    ios: UserBroadcastPlatformPreviewSchema,
    android: UserBroadcastPlatformPreviewSchema,
  }),
});
export type PreviewUserBroadcastOutput = z.infer<
  typeof PreviewUserBroadcastOutputSchema
>;
