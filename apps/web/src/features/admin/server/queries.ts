// Read-side queries for the admin console. Every entry point calls
// requireAdmin() — non-admins get notFound() which surfaces as 404.

import "server-only"
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { user as userTable, audit_log } from "@mlabs/db/schema"
import { requireAdmin } from "@/lib/auth/server"
import {
  ADMIN_PAGE_SIZE,
  ADMIN_AUDIT_PAGE_SIZE,
  type AdminAuditRow,
  type AdminUserRow,
  type AdminUsersFilters,
} from "../types"

export interface ListUsersResult {
  items: AdminUserRow[]
  total: number
  page: number
  pageSize: number
}

export async function listUsers(
  filters: AdminUsersFilters,
): Promise<ListUsersResult> {
  await requireAdmin()

  const page = Math.max(1, filters.page ?? 1)
  const offset = (page - 1) * ADMIN_PAGE_SIZE

  const conditions = []
  if (filters.q && filters.q.trim()) {
    const pattern = `%${filters.q.trim()}%`
    conditions.push(
      or(ilike(userTable.name, pattern), ilike(userTable.email, pattern))!,
    )
  }
  if (filters.role && filters.role !== "all") {
    conditions.push(eq(userTable.role, filters.role))
  }
  if (filters.banned === "banned") {
    conditions.push(isNotNull(userTable.banned_at))
  } else if (filters.banned === "active") {
    conditions.push(isNull(userTable.banned_at))
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  // Two queries: page rows + total count. Could combine via window function
  // but the readability cost isn't worth it for an admin-only path that
  // runs maybe dozens of times per day.
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
    .offset(offset)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(userTable)
    .where(where)

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      email_verified: r.email_verified,
      image: r.image ?? null,
      role: (r.role === "admin" ? "admin" : "user") as AdminUserRow["role"],
      banned_at: r.banned_at ? new Date(r.banned_at).toISOString() : null,
      banned_reason: r.banned_reason ?? null,
      created_at: new Date(r.created_at).toISOString(),
    })),
    total: total ?? 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  }
}

export async function getUserDetail(
  targetId: string,
): Promise<{ user: AdminUserRow; audit: AdminAuditRow[] } | null> {
  await requireAdmin()

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
    .limit(1)
  if (!row) return null

  // Audit entries where this user is either the actor OR the target. Joined
  // back to user for actor email (NULLable: anonymized actors → null).
  const actor = userTable
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
    .limit(ADMIN_AUDIT_PAGE_SIZE)

  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      email_verified: row.email_verified,
      image: row.image ?? null,
      role: (row.role === "admin" ? "admin" : "user") as AdminUserRow["role"],
      banned_at: row.banned_at ? new Date(row.banned_at).toISOString() : null,
      banned_reason: row.banned_reason ?? null,
      created_at: new Date(row.created_at).toISOString(),
    },
    audit: auditRows.map((a) => ({
      id: a.id,
      actor_id: a.actor_id,
      actor_email: a.actor_email ?? null,
      action: a.action,
      target_type: a.target_type,
      target_id: a.target_id,
      metadata: a.metadata,
      at: new Date(a.at).toISOString(),
    })),
  }
}

export interface ListAuditOpts {
  page?: number
  since?: Date | null
  until?: Date | null
}

export interface ListAuditResult {
  items: AdminAuditRow[]
  total: number
  page: number
  pageSize: number
}

export async function listAudit(
  opts: ListAuditOpts,
): Promise<ListAuditResult> {
  await requireAdmin()
  const page = Math.max(1, opts.page ?? 1)
  const offset = (page - 1) * ADMIN_AUDIT_PAGE_SIZE

  const conditions = []
  if (opts.since) conditions.push(sql`${audit_log.at} >= ${opts.since}`)
  if (opts.until) conditions.push(sql`${audit_log.at} < ${opts.until}`)
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: audit_log.id,
      actor_id: audit_log.actor_id,
      actor_email: userTable.email,
      action: audit_log.action,
      target_type: audit_log.target_type,
      target_id: audit_log.target_id,
      metadata: audit_log.metadata,
      at: audit_log.at,
    })
    .from(audit_log)
    .leftJoin(userTable, eq(userTable.id, audit_log.actor_id))
    .where(where)
    .orderBy(desc(audit_log.at))
    .limit(ADMIN_AUDIT_PAGE_SIZE)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(audit_log)
    .where(where)

  return {
    items: rows.map((a) => ({
      id: a.id,
      actor_id: a.actor_id,
      actor_email: a.actor_email ?? null,
      action: a.action,
      target_type: a.target_type,
      target_id: a.target_id,
      metadata: a.metadata,
      at: new Date(a.at).toISOString(),
    })),
    total: total ?? 0,
    page,
    pageSize: ADMIN_AUDIT_PAGE_SIZE,
  }
}

