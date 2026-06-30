import "server-only"

// Admin-facing waitlist queries + delete.
//
// listAdmin + getCounts are pure reads. deleteWaitlistEntry mirrors
// community.deletePost: snapshot the row to capture audit meta, throw
// notFound() if absent, then run audit + delete inside a single
// transaction so a failed audit rolls back the delete (the
// audit-first-then-mutate contract documented in packages/db/src/audit.ts).
//
// The marketing POST endpoint at apps/web/src/app/api/v1/business-waitlist
// remains the only writer; this module never inserts.

import { desc, eq, sql } from "drizzle-orm"
import { waitlist } from "@aira/db/schema"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import { ApiError } from "@aira/api/errors"
import { createAudit } from "@aira/db/audit"
import type {
  WaitlistAdminListItem,
  WaitlistAdminListOutput,
  WaitlistAdminCountsOutput,
  WaitlistType,
} from "@aira/validators"

// Cap aligns with the page subtitle's "Showing 100 of N" hint.
const LIST_LIMIT = 100

function auditClient(ctx: CallerContext): "web" | "mobile" {
  return ctx.source === "mobile" ? "mobile" : "web"
}

/** Newest-first listing for one waitlist type, capped at 100. total is
 *  the unbounded count over the same filter so the page can show
 *  "Showing 100 of N". */
export async function listAdmin(
  db: Database,
  args: { type: WaitlistType },
): Promise<WaitlistAdminListOutput> {
  const where = eq(waitlist.type, args.type)

  const rows = await db
    .select({
      id: waitlist.id,
      type: waitlist.type,
      email: waitlist.email,
      created_at: waitlist.created_at,
      source: waitlist.source,
      full_name: waitlist.full_name,
      business_name: waitlist.business_name,
      phone: waitlist.phone,
      preferred_contact: waitlist.preferred_contact,
      preferred_time: waitlist.preferred_time,
    })
    .from(waitlist)
    .where(where)
    .orderBy(desc(waitlist.created_at))
    .limit(LIST_LIMIT)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(waitlist)
    .where(where)

  // Cast at the boundary — db row's `type` / `source` / preferred enums
  // are `string` from Drizzle's text() column, but the CHECK constraints
  // guarantee the value space. The validator at the route boundary will
  // verify before the wire shape is published.
  const items: WaitlistAdminListItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type as WaitlistAdminListItem["type"],
    email: r.email,
    created_at: r.created_at.toISOString(),
    source: r.source as WaitlistAdminListItem["source"],
    full_name: r.full_name,
    business_name: r.business_name,
    phone: r.phone,
    preferred_contact:
      r.preferred_contact as WaitlistAdminListItem["preferred_contact"],
    preferred_time:
      r.preferred_time as WaitlistAdminListItem["preferred_time"],
  }))

  return { items, total }
}

/** Per-type counts for the page header tiles. Single grouped query;
 *  defaults missing types to 0 so the output shape is always full. */
export async function getCounts(
  db: Database,
): Promise<WaitlistAdminCountsOutput> {
  const rows = await db
    .select({
      type: waitlist.type,
      count: sql<number>`count(*)::int`,
    })
    .from(waitlist)
    .groupBy(waitlist.type)

  const out: WaitlistAdminCountsOutput = { consumer: 0, business: 0 }
  for (const r of rows) {
    if (r.type === "consumer") out.consumer = r.count
    else if (r.type === "business") out.business = r.count
  }
  return out
}

/** Hard-delete a single waitlist row. Snapshot-first so the audit meta
 *  has email + type even after the row is gone; audit + delete share one
 *  transaction so a failed audit rolls the delete back. */
export async function deleteWaitlistEntry(
  db: Database,
  ctx: CallerContext,
  args: { id: string },
): Promise<{ ok: true }> {
  const [snapshot] = await db
    .select({ email: waitlist.email, type: waitlist.type })
    .from(waitlist)
    .where(eq(waitlist.id, args.id))
    .limit(1)

  if (!snapshot) {
    throw ApiError.notFound("waitlist.not_found", "Entry not found.")
  }

  // DB CHECK on waitlist.type pins the value space; the local narrows
  // string → WaitlistType so the audit meta carries the discriminated
  // literal across the transaction closure.
  let waitlist_type: WaitlistType
  if (snapshot.type === "consumer" || snapshot.type === "business") {
    waitlist_type = snapshot.type
  } else {
    throw new Error(
      `waitlist row ${args.id} has unknown type "${snapshot.type}"`,
    )
  }

  await db.transaction(async (tx) => {
    const audit = createAudit(tx)
    await audit({
      actorId: ctx.userId,
      action: "waitlist.delete",
      target: { type: "waitlist", id: args.id },
      meta: {
        kind: "waitlist.delete",
        email: snapshot.email,
        waitlist_type,
      },
      client: auditClient(ctx),
    })

    await tx.delete(waitlist).where(eq(waitlist.id, args.id))
  })

  return { ok: true }
}

