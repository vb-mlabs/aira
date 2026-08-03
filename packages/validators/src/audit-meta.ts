// Isomorphic audit-log types and known-value arrays.
//
// Moved here from @aira/db/audit (server-only) so client components can
// import AuditMeta + the known-action/target arrays without dragging in
// the server-only directive. createAudit, AuditFn, AuditOpts, AuditDb
// remain in @aira/db/audit (they're truly server-side).
//
// Adding a new variant to the union below:
//   1. Append to AuditMeta
//   2. Append the matching string literal to KNOWN_AUDIT_ACTIONS
//   3. The _ActionsCoverage assertion will fail at compile time until
//      both happen
//   4. Add a switch case in
//      apps/web/src/features/admin/audit/render-detail.tsx — the
//      `never`-typed default branch fires a tsc error until you do

import { z } from "zod";

// ─── AuditMeta discriminated union ──────────────────────────────────────────

export type AuditMeta =
  | { kind: "user.role_changed"; from: string; to: string }
  | { kind: "user.banned"; reason?: string }
  | { kind: "user.unbanned" }
  | { kind: "user.password_reset_sent" }
  | { kind: "user.email_changed"; from_email_hash: string }
  | { kind: "user.deleted_anonymized" }
  // session.revoked.reason values:
  //   logout            — explicit user-initiated sign-out.
  //   admin             — admin-side session revocation.
  //   password_change   — Better Auth invalidates sessions on password reset.
  //   account_deleted   — anonymise-in-place flow cascades session deletion.
  //   idle_timeout      — requireAdmin() forced sign-out after 30min idle.
  | {
      kind: "session.revoked";
      reason:
        | "logout"
        | "admin"
        | "password_change"
        | "account_deleted"
        | "idle_timeout";
    }
  | { kind: "user.avatar_changed" }
  | { kind: "user.avatar_removed" }
  | { kind: "user.name_changed" }
  | { kind: "user.admin_notified"; title: string }
  // Sprint 1 — authentication-event audit trail.
  //   user.signed_in       — successful sign-in (cookie or JWT).
  //   user.signed_in_failed — sign-in attempt rejected. actor_id is null for
  //                           user_not_found (we don't know who tried) and
  //                           the user's id for bad_password / banned /
  //                           email_unverified (the email matched a real
  //                           account).
  //   user.signed_up       — successful new-account creation.
  | { kind: "user.signed_in" }
  | {
      kind: "user.signed_in_failed";
      reason: "bad_password" | "user_not_found" | "banned" | "email_unverified";
    }
  | { kind: "user.signed_up" }
  // Admin curation of the business directory. target_id is the business.id.
  | { kind: "business.archived" }
  | { kind: "business.restored" }
  // Admin edit of the free-text contact_person field on a business listing.
  // from/to are the values before/after the edit; null encodes an unset
  // value. Emitted only when old !== new (no-op edits don't write).
  | {
      kind: "business.contact_person_changed";
      from: string | null;
      to: string | null;
    }
  // Admin rename of a category slug cascaded to this business — the
  // business's `category` text column pointed at the old slug and was
  // updated in the same transaction so it doesn't orphan. One audit row
  // per affected business. target.id = business.id.
  | {
      kind: "business.category_slug_cascaded";
      from: string;
      to: string;
    }
  // Admin verification-workflow change: either the `verified` boolean
  // or the free-text `verification_notes` (or both) changed. Combined
  // audit row per save (mirrors the community.post_edited fields-array
  // pattern) so a single "verify + record notes" click reads as one
  // decision in the timeline. Per-field from/to entries are populated
  // ONLY for the fields that actually changed. target.id = business.id.
  | {
      kind: "business.verification_changed";
      fields: Array<"verified" | "verification_notes">;
      verified?: { from: boolean; to: boolean };
      verification_notes?: { from: string | null; to: string | null };
    }
  // S4 — subscription + sponsorship audit trail.
  | {
      kind: "business.subscription_recorded";
      payment_status: "paid" | "pending" | "overdue";
      plan_id: string | null;
      end_date: string;
    }
  | { kind: "business.subscription_voided" }
  | { kind: "business.subscription_updated" }
  | {
      kind: "business.sponsorship_assigned";
      tier_id: string;
      end_date: string;
      amount_cents: number;
    }
  | { kind: "business.sponsorship_cancelled" }
  | { kind: "business.sponsorship_updated" }
  | { kind: "business.sponsorship_evidence_uploaded" }
  // S5 — AppSetting admin edits. target.id = AppSetting.key (stable id is
  // the row id, but the key is what humans recognise in /admin/cron and
  // /admin/settings). Used by F17 (reminder_schedule) and future keys.
  | {
      kind: "app_setting.updated";
      key: string;
      old: string | null;
      new: string;
    }
  // S5 — F20 v2 community moderation: hard-delete + edit.
  //
  // post_deleted carries a full snapshot of the row before it disappears
  // (the audit trail is the only record after the row + cascaded interests
  // are gone). post_edited carries a before/after pair PER FIELD — the
  // `fields` array signals which keys are populated so consumers don't
  // have to probe for undefined.
  | {
      kind: "community.post_deleted";
      title: string;
      body: string | null;
      status: "pending" | "approved" | "expired" | "rejected";
      author_id: string;
      interest_count: number;
    }
  | {
      kind: "community.post_edited";
      fields: Array<"title" | "body" | "phone" | "email">;
      title?: { from: string; to: string };
      body?: { from: string | null; to: string | null };
      phone?: { from: string | null; to: string | null };
      email?: { from: string | null; to: string | null };
    }
  // Self-service edit on an approved community post sends the row back
  // for re-moderation. Written alongside community.post_edited in the
  // same transaction so the audit trail shows both the diff AND the
  // status transition (keeps each audit kind single-purpose). Captures
  // the previous approved_at + expires_at so admins can reason about
  // the timeline if a post bounces between states.
  | {
      kind: "community.post_reverted_to_pending";
      from: "approved";
      to: "pending";
      prev_approved_at: string;
      prev_expires_at: string | null;
    }
  // Comment thread moderation. Admin hides/restores a comment without
  // hard-deleting (the body is preserved in the DB but never projected
  // to the wire while hidden). Cascade-delete via FK takes care of
  // replies when the top-level is hard-deleted, so the audit row only
  // captures the parent. body_snapshot is the verbatim body at the
  // time of the moderation action.
  | {
      kind: "community.comment_hidden";
      post_id: string;
      body_snapshot: string;
    }
  | {
      kind: "community.comment_restored";
      post_id: string;
    }
  | {
      kind: "community.comment_deleted";
      post_id: string;
      author_id: string;
      body_snapshot: string;
      was_reply: boolean;
    }
  // S6 — F23′ admin renewal follow-up queue. One row per call/attempt.
  // target.id = business_subscription.id. Single action kind + outcome
  // inside metadata (mirrors session.revoked.reason precedent).
  | {
      kind: "business.subscription_followup";
      outcome:
        | "called"
        | "voicemail"
        | "no_answer"
        | "refused"
        | "paid"
        | "reschedule";
      note: string | null;
      scheduled_next: string | null;
    }
  // G1 — business owner reachability. target.id = business.id for assign /
  // unassign; broadcast_sent has no target (admin action with N recipients
  // counted in meta).
  | {
      kind: "business.owner_assigned";
      owner_user_id: string;
      owner_email: string;
      /** Previous owner_user_id when this was a re-assign (overwrite).
       *  null on first assignment. */
      prev_owner_user_id: string | null;
    }
  | {
      kind: "business.owner_unassigned";
      prev_owner_user_id: string;
    }
  | {
      kind: "business.broadcast_sent";
      title: string;
      recipient_count: number;
    }
  // Admin fan-out to end-users (via /admin/users "Notify users"). No
  // per-recipient target — one audit row per fan-out. platform_filter
  // captures the audience scope for post-hoc triage; 'all' when no
  // platform narrowing was applied. recipient_count is the number of
  // distinct users that matched the audience (devices are downstream
  // and captured via notification_delivery, not the audit trail).
  | {
      kind: "admin.user_broadcast_sent";
      title: string;
      recipient_count: number;
      platform_filter: "all" | "ios" | "android";
    }
  // Admin hard-deletes a pre-launch waitlist row from /admin/waitlist.
  // target.id = waitlist.id. email + waitlist_type captured pre-delete so
  // the audit row remains useful after the source row is gone.
  | {
      kind: "waitlist.delete";
      email: string;
      waitlist_type: "consumer" | "business";
    };

// ─── Known actions / target types ───────────────────────────────────────────

/** Stable string array of every AuditMeta.kind value. Used by:
 *   - the Zod enum schema for the action filter at the admin boundary
 *   - the action-filter dropdown UI on /admin/audit
 *   - the auditActionLabel() helper for humanised dropdown labels
 *
 *  Adding a kind here without also adding it to AuditMeta — or vice
 *  versa — fails the _ActionsCoverage assertion below at compile time.
 */
export const KNOWN_AUDIT_ACTIONS = [
  "user.role_changed",
  "user.banned",
  "user.unbanned",
  "user.password_reset_sent",
  "user.email_changed",
  "user.deleted_anonymized",
  "session.revoked",
  "user.avatar_changed",
  "user.avatar_removed",
  "user.name_changed",
  "user.admin_notified",
  "user.signed_in",
  "user.signed_in_failed",
  "user.signed_up",
  "business.archived",
  "business.restored",
  "business.contact_person_changed",
  "business.category_slug_cascaded",
  "business.verification_changed",
  "business.subscription_recorded",
  "business.subscription_voided",
  "business.subscription_updated",
  "business.sponsorship_assigned",
  "business.sponsorship_cancelled",
  "business.sponsorship_updated",
  "business.sponsorship_evidence_uploaded",
  "app_setting.updated",
  "community.post_deleted",
  "community.post_edited",
  "community.post_reverted_to_pending",
  "community.comment_hidden",
  "community.comment_restored",
  "community.comment_deleted",
  "business.subscription_followup",
  "business.owner_assigned",
  "business.owner_unassigned",
  "business.broadcast_sent",
  "admin.user_broadcast_sent",
  "waitlist.delete",
] as const;
export type KnownAuditAction = (typeof KNOWN_AUDIT_ACTIONS)[number];

/** Compile-time bidirectional check that AuditMeta.kind and
 *  KNOWN_AUDIT_ACTIONS stay in sync. Either side adding a value without
 *  the other side updating fails this assertion. */
type _ActionsCoverage = [
  AuditMeta["kind"] extends KnownAuditAction ? true : false,
  KnownAuditAction extends AuditMeta["kind"] ? true : false,
];
// Force the type to be exactly [true, true]. Any 'false' triggers tsc.
const _actionsCoverageCheck: _ActionsCoverage = [true, true];
void _actionsCoverageCheck;

/** Distinct target_type values that appear in audit_log.target_type for
 *  every typed action. Used by the target-type filter dropdown and the
 *  per-target link resolver. `session` rows generally have no target. */
export const KNOWN_AUDIT_TARGET_TYPES = [
  "user",
  "business",
  "business_subscription",
  "sponsorship",
  "community_post",
  "app_setting",
  "session",
  "waitlist",
] as const;
export type KnownAuditTargetType = (typeof KNOWN_AUDIT_TARGET_TYPES)[number];

// ─── Zod schemas (for input validation at the admin boundary) ───────────────

export const KnownAuditActionSchema = z.enum(KNOWN_AUDIT_ACTIONS);
export const KnownAuditTargetTypeSchema = z.enum(KNOWN_AUDIT_TARGET_TYPES);

// ─── Humanised label for the action dropdown ────────────────────────────────

/** Hand-curated labels for cases where auto-derive reads badly. Auto-derive
 *  splits on `.` then `_`, drops the domain prefix, and titlecases — that
 *  produces "Signed in failed" for "user.signed_in_failed", which is wrong
 *  word order. Override map fixes those targeted cases. */
export const AUDIT_ACTION_LABEL_OVERRIDES: Partial<Record<KnownAuditAction, string>> =
  {
    "user.signed_in_failed": "Sign-in failed",
    "business.subscription_recorded": "Subscription recorded",
    "business.subscription_followup": "Renewal follow-up",
    "business.sponsorship_assigned": "Sponsorship assigned",
    "business.sponsorship_cancelled": "Sponsorship cancelled",
    "business.sponsorship_updated": "Sponsorship updated",
    "business.sponsorship_evidence_uploaded": "Sponsorship evidence uploaded",
    "business.subscription_voided": "Subscription voided",
    "business.subscription_updated": "Subscription updated",
    "community.post_deleted": "Post deleted",
    "community.post_edited": "Post edited",
    "community.post_reverted_to_pending": "Post reverted to pending",
    "community.comment_hidden": "Comment hidden",
    "community.comment_restored": "Comment restored",
    "community.comment_deleted": "Comment deleted",
    "app_setting.updated": "Setting updated",
    "business.owner_assigned": "Owner assigned",
    "business.owner_unassigned": "Owner unassigned",
    "business.broadcast_sent": "Broadcast sent",
    "admin.user_broadcast_sent": "User broadcast sent",
    "business.contact_person_changed": "Contact person changed",
    "business.category_slug_cascaded": "Category renamed",
    "business.verification_changed": "Verification changed",
  };

/** Convert an action kind string into a humanised dropdown label.
 *  Looks up the override map first; otherwise auto-derives by dropping
 *  the domain prefix (`user.role_changed` → `role_changed`),
 *  splitting on `_`, and titlecasing the first word. */
export function auditActionLabel(action: KnownAuditAction): string {
  const override = AUDIT_ACTION_LABEL_OVERRIDES[action];
  if (override) return override;
  const localPart = action.includes(".") ? action.split(".").slice(1).join(".") : action;
  const words = localPart.split("_");
  if (words.length === 0) return action;
  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" ");
}

/** Domain prefix (everything before the first `.`) — used to group the
 *  action dropdown into <optgroup>s. Returns "other" if no prefix. */
export function auditActionDomain(action: KnownAuditAction): string {
  const dotIdx = action.indexOf(".");
  return dotIdx > 0 ? action.slice(0, dotIdx) : "other";
}
