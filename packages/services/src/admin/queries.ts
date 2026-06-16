// Read-side queries for the admin console.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// permission: "admin" + the freshness gate before invoking these). DB rows
// with role: "super_admin" bucket under "admin" for UI display — see the
// types JSDoc at @aira/validators/admin for why.

import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
  user as userTable,
  audit_log,
  businessSubscriptions,
  sponsorships,
} from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import {
  ADMIN_PAGE_SIZE,
  ADMIN_AUDIT_PAGE_SIZE,
  type AdminAuditRow,
  type AdminUserRow,
  type AdminUsersFilters,
  type ListAuditInput,
  type ListAuditOutput,
  type ListUsersOutput,
  type UserDetailOutput,
} from "@aira/validators/admin";

export async function listUsers(
  db: Database,
  filters: AdminUsersFilters,
): Promise<ListUsersOutput> {
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;

  const conditions = [];
  if (filters.q && filters.q.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push(
      or(ilike(userTable.name, pattern), ilike(userTable.email, pattern))!,
    );
  }
  if (filters.role && filters.role !== "all") {
    conditions.push(eq(userTable.role, filters.role));
  }
  if (filters.banned === "banned") {
    conditions.push(isNotNull(userTable.banned_at));
  } else if (filters.banned === "active") {
    conditions.push(isNull(userTable.banned_at));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Two queries: page rows + total count. Window function would be slightly
  // cheaper but the readability cost isn't worth it for an admin-only path
  // that runs maybe dozens of times per day.
  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      email_verified: userTable.emailVerified,
      image: userTable.image,
      role: userTable.role,
      banned_at: userTable.banned_at,
      banned_reason: userTable.banned_reason,
      created_at: userTable.createdAt,
    })
    .from(userTable)
    .where(where)
    .orderBy(desc(userTable.createdAt))
    .limit(ADMIN_PAGE_SIZE)
    .offset(offset);

  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(userTable)
    .where(where);
  const total = count?.total ?? 0;

  return {
    items: rows.map(toAdminUserRow),
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function getUserDetail(
  db: Database,
  targetId: string,
): Promise<UserDetailOutput> {
  const [row] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      email_verified: userTable.emailVerified,
      image: userTable.image,
      role: userTable.role,
      banned_at: userTable.banned_at,
      banned_reason: userTable.banned_reason,
      created_at: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, targetId))
    .limit(1);
  if (!row) return { user: null, audit: [] };

  // Audit entries where this user is either the actor OR the target. Joined
  // back to user for actor email (null when actor was anonymized).
  const actor = userTable;
  const auditRows = await db
    .select({
      id: audit_log.id,
      actor_id: audit_log.actor_id,
      actor_email: actor.email,
      action: audit_log.action,
      target_type: audit_log.target_type,
      target_id: audit_log.target_id,
      metadata: audit_log.metadata,
      at: audit_log.at,
    })
    .from(audit_log)
    .leftJoin(actor, eq(actor.id, audit_log.actor_id))
    .where(
      or(
        eq(audit_log.actor_id, targetId),
        and(
          eq(audit_log.target_type, "user"),
          eq(audit_log.target_id, targetId),
        ),
      ),
    )
    .orderBy(desc(audit_log.at))
    .limit(ADMIN_AUDIT_PAGE_SIZE);

  return {
    user: toAdminUserRow(row),
    audit: auditRows.map(toAdminAuditRow),
  };
}

export async function listAudit(
  db: Database,
  input: ListAuditInput,
): Promise<ListAuditOutput> {
  const page = Math.max(1, input.page ?? 1);
  const offset = (page - 1) * ADMIN_AUDIT_PAGE_SIZE;

  const conditions = [];
  if (input.since) {
    conditions.push(sql`${audit_log.at} >= ${new Date(input.since)}`);
  }
  if (input.until) {
    conditions.push(sql`${audit_log.at} < ${new Date(input.until)}`);
  }
  if (input.actor_id) {
    conditions.push(eq(audit_log.actor_id, input.actor_id));
  }
  if (input.target_type) {
    conditions.push(eq(audit_log.target_type, input.target_type));
  }
  if (input.action) {
    conditions.push(eq(audit_log.action, input.action));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Two conditional LEFT JOINs surface the parent business id for audit
  // rows whose target is a subscription or a sponsorship. The renderer
  // uses this to link the target id straight to the parent
  // /admin/businesses/<id> page instead of just showing a UUID.
  const rows = await db
    .select({
      id: audit_log.id,
      actor_id: audit_log.actor_id,
      actor_email: userTable.email,
      action: audit_log.action,
      target_type: audit_log.target_type,
      target_id: audit_log.target_id,
      target_business_id: sql<
        string | null
      >`COALESCE(${businessSubscriptions.business_id}, ${sponsorships.business_id})`,
      metadata: audit_log.metadata,
      at: audit_log.at,
    })
    .from(audit_log)
    .leftJoin(userTable, eq(userTable.id, audit_log.actor_id))
    .leftJoin(
      businessSubscriptions,
      and(
        eq(audit_log.target_type, "business_subscription"),
        eq(audit_log.target_id, businessSubscriptions.id),
      ),
    )
    .leftJoin(
      sponsorships,
      and(
        eq(audit_log.target_type, "sponsorship"),
        eq(audit_log.target_id, sponsorships.id),
      ),
    )
    .where(where)
    .orderBy(desc(audit_log.at))
    .limit(ADMIN_AUDIT_PAGE_SIZE)
    .offset(offset);

  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(audit_log)
    .where(where);
  const total = count?.total ?? 0;

  return {
    items: rows.map(toAdminAuditRow),
    total,
    page,
    pageSize: ADMIN_AUDIT_PAGE_SIZE,
  };
}

function toAdminUserRow(row: {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  role: string;
  banned_at: Date | null;
  banned_reason: string | null;
  created_at: Date;
}): AdminUserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    email_verified: row.email_verified,
    image: row.image ?? null,
    // Bucket super_admin under admin for UI display — surfacing it as a
    // flippable role here would risk accidental demotion through the
    // role-change UI. The changeRole service rejects super_admin targets
    // independently.
    role: row.role === "end_user" ? "end_user" : "admin",
    banned_at: row.banned_at ? new Date(row.banned_at).toISOString() : null,
    banned_reason: row.banned_reason ?? null,
    created_at: new Date(row.created_at).toISOString(),
  };
}

function toAdminAuditRow(row: {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_business_id?: string | null;
  metadata: unknown;
  at: Date;
}): AdminAuditRow {
  return {
    id: row.id,
    actor_id: row.actor_id,
    actor_email: row.actor_email ?? null,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    target_business_id: row.target_business_id ?? null,
    metadata: row.metadata,
    at: new Date(row.at).toISOString(),
  };
}
