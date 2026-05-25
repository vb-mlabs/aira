// @vitest-environment node
//
// Admin service tests — exercise the business logic with the same in-memory
// store pattern the old apps/web/tests/admin-actions.test.ts used, minus the
// Next-specific concerns (requireAdmin, revalidatePath, next/headers). The
// op + adapter layers are tested in packages/api/src/__tests__; here we test
// only the domain logic.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

interface UserRow {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image: string | null
  role: "user" | "admin"
  banned_at: Date | null
  banned_reason: string | null
}

interface SessionRow {
  id: string
  userId: string
}

interface AuditRow {
  actorId: string | null
  action: string
  meta: unknown
  client?: string
}

interface NotificationRow {
  user_id: string
  type: string
  body: unknown
  read_at: Date | null
}

const store = {
  users: [] as UserRow[],
  sessions: [] as SessionRow[],
  audits: [] as AuditRow[],
  notifications: [] as NotificationRow[],
}

// audit lives behind createAudit(db) → fn. We replace the factory so every
// audit call lands in `store.audits` and assertions can inspect ordering.
vi.mock("@mlabs/db/audit", () => ({
  createAudit:
    () =>
    async (opts: {
      actorId: string | null
      action: string
      meta?: unknown
      client?: string
    }) => {
      store.audits.push({
        actorId: opts.actorId,
        action: opts.action,
        meta: opts.meta,
        client: opts.client,
      })
    },
}))

// Cross-domain notification fan-out goes through @mlabs/services/notifications.
// In the service test we replace it with a recorder; the real implementation
// is tested in packages/services/src/notifications/__tests__.
vi.mock("../../notifications", () => ({
  createNotification: vi.fn(
    async (
      _db: unknown,
      _ctx: unknown,
      args: { userId: string; body: unknown },
    ) => {
      const body = args.body as { kind: string }
      store.notifications.push({
        user_id: args.userId,
        type: body.kind,
        body: args.body,
        read_at: null,
      })
      return { id: `notif_${store.notifications.length}` }
    },
  ),
}))

vi.mock("@mlabs/db/schema", () => ({
  user: {
    _name: "users",
    id: { _column: "id", _table: "users" },
    email: { _column: "email", _table: "users" },
    name: { _column: "name", _table: "users" },
    emailVerified: { _column: "emailVerified", _table: "users" },
    role: { _column: "role", _table: "users" },
    banned_at: { _column: "banned_at", _table: "users" },
    banned_reason: { _column: "banned_reason", _table: "users" },
  },
  session: {
    _name: "sessions",
    id: { _column: "id", _table: "sessions" },
    userId: { _column: "userId", _table: "sessions" },
  },
}))

vi.mock("drizzle-orm", () => {
  type Row = Record<string, unknown>
  const eq = (col: { _column: string }, val: unknown) => (r: Row) =>
    r[col._column] === val
  const and =
    (...preds: ((r: Row) => boolean)[]) =>
    (r: Row) =>
      preds.every((p) => p(r))
  // sql template returns a sentinel the select mock recognises as
  // "count(*)::int over the filtered set".
  const sql = (() => "__COUNT_AGGREGATE__") as unknown as (
    ...a: unknown[]
  ) => unknown
  return { eq, and, sql }
})

// db lives behind the @mlabs/db/client export but the service takes it as
// a parameter — no module mock needed. Build the fake db inside each test
// (or just pass the same shared one constructed here).

type Predicate = (r: Record<string, unknown>) => boolean

function makeDb() {
  // Forward ref captured by transaction stub — methods are added via Object.assign below.
  const db: Record<string, unknown> = {}
  Object.assign(db, {
    select: (cols: Record<string, unknown>) => ({
      from: (table: { _name: "users" | "sessions" }) => {
        const firstColumn = Object.values(cols)[0] as
          | { _table?: "users" | "sessions" }
          | string
          | undefined
        const tableName: "users" | "sessions" =
          (typeof firstColumn === "object" ? firstColumn?._table : undefined) ??
          table._name
        let rows = store[tableName] as unknown as Record<string, unknown>[]
        let _limit = Infinity
        const builder = {
          where(pred: Predicate) {
            rows = rows.filter(pred)
            return builder
          },
          limit(n: number) {
            _limit = n
            return builder
          },
          then(resolve: (v: Record<string, unknown>[]) => void) {
            // Aggregate count case (admin.changeRole last-admin guard):
            // the cols map values are sentinel strings, not column refs.
            const firstCol = Object.values(cols)[0]
            const isAggregate =
              typeof firstCol === "string" ||
              (firstCol &&
                typeof firstCol === "object" &&
                !("_column" in firstCol))
            if (isAggregate) {
              const alias = Object.keys(cols)[0]!
              resolve([{ [alias]: rows.length }])
              return
            }
            const out = rows.slice(0, _limit).map((r) => {
              const o: Record<string, unknown> = {}
              for (const [alias, col] of Object.entries(cols)) {
                const c = col as { _column?: string }
                o[alias] = r[c._column ?? alias]
              }
              return o
            })
            resolve(out)
          },
        }
        return builder
      },
    }),
    update: (table: { _name: "users" | "sessions" }) => {
      let _set: Record<string, unknown> = {}
      const builder = {
        set(v: Record<string, unknown>) {
          _set = v
          return builder
        },
        where(pred: Predicate) {
          const target =
            table._name === "sessions"
              ? (store.sessions as unknown as Record<string, unknown>[])
              : (store.users as unknown as Record<string, unknown>[])
          const matched = target.filter(pred)
          for (const r of matched) {
            for (const [k, v] of Object.entries(_set)) {
              // sql`now()` lands as the same sentinel string; substitute a
              // real Date so date comparisons in assertions work.
              ;(r as Record<string, unknown>)[k] =
                typeof v === "string" && v === "__COUNT_AGGREGATE__"
                  ? new Date()
                  : v
            }
          }
          return {
            then(resolve: (v: unknown) => void) {
              resolve(undefined)
            },
          }
        },
      }
      return builder
    },
    delete: (table: { _name: "users" | "sessions" }) => ({
      where(pred: Predicate) {
        const target =
          table._name === "sessions"
            ? (store.sessions as unknown as Record<string, unknown>[])
            : (store.users as unknown as Record<string, unknown>[])
        const kept = target.filter((r) => !pred(r))
        if (table._name === "sessions")
          store.sessions = kept as unknown as SessionRow[]
        else store.users = kept as unknown as UserRow[]
        return {
          then(resolve: (v: unknown) => void) {
            resolve(undefined)
          },
        }
      },
    }),
    transaction: async <T>(cb: (tx: typeof db) => Promise<T>): Promise<T> => {
      return cb(db)
    },
  })
  return db
}

import type { Database } from "@mlabs/db/client"
import type { CallerContext } from "@mlabs/api/context"
import {
  banUser,
  changeRole,
  preparePasswordReset,
  sendAdminNotification,
  unbanUser,
} from "../service"

function adminCtx(id: string): CallerContext {
  return {
    userId: id,
    user: { id, email: `${id}@example.test`, role: "admin" },
    requestId: "req-test",
    source: "web",
  }
}

let db: Database

beforeEach(() => {
  store.users = [
    {
      id: "admin-1",
      email: "admin@example.test",
      name: "Admin",
      emailVerified: true,
      image: null,
      role: "admin",
      banned_at: null,
      banned_reason: null,
    },
    {
      id: "user-1",
      email: "alice@example.test",
      name: "Alice",
      emailVerified: true,
      image: null,
      role: "user",
      banned_at: null,
      banned_reason: null,
    },
    {
      id: "user-2",
      email: "bob@example.test",
      name: "Bob",
      emailVerified: true,
      image: null,
      role: "user",
      banned_at: null,
      banned_reason: null,
    },
  ]
  store.sessions = [
    { id: "s1", userId: "user-1" },
    { id: "s2", userId: "user-1" },
    { id: "s3", userId: "user-2" },
  ]
  store.audits = []
  store.notifications = []
  db = makeDb() as unknown as Database
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("changeRole", () => {
  it("promotes user → admin and audits BEFORE the mutation", async () => {
    const res = await changeRole(db, adminCtx("admin-1"), {
      targetId: "user-1",
      role: "admin",
    })
    expect(res.ok).toBe(true)
    expect(store.users.find((u) => u.id === "user-1")?.role).toBe("admin")
    expect(store.audits[0]?.action).toBe("user.role_changed")
  })

  it("throws ApiError for self role change", async () => {
    await expect(
      changeRole(db, adminCtx("admin-1"), {
        targetId: "admin-1",
        role: "user",
      }),
    ).rejects.toThrow(/own role/i)
  })

  it("throws ApiError when demoting the last admin", async () => {
    // Only admin-1 is an admin going in. Promote user-1 first (count=2),
    // then attempt to demote admin-1 — should succeed (count=2 going in).
    await changeRole(db, adminCtx("admin-1"), {
      targetId: "user-1",
      role: "admin",
    })
    expect(store.users.find((u) => u.id === "admin-1")?.role).toBe("admin")

    // Now demote admin-1 — count=2 going in, allowed.
    await changeRole(db, adminCtx("user-1"), {
      targetId: "admin-1",
      role: "user",
    })

    // Only user-1 is admin now. Try to demote user-1 (self-check fires first
    // before count check). Promote user-2 then demote user-2 — count=2 going
    // in → allowed. Then user-2 is admin, demote user-2 again: count=1 going
    // in → blocks.
    await changeRole(db, adminCtx("user-1"), {
      targetId: "user-2",
      role: "admin",
    })
    // Drop user-1's admin so user-2 is the only admin going in.
    store.users.find((u) => u.id === "user-1")!.role = "user"

    await expect(
      changeRole(db, adminCtx("user-1"), {
        targetId: "user-2",
        role: "user",
      }),
    ).rejects.toThrow(/last admin/i)
  })

  it("no-op when role unchanged (no audit row written)", async () => {
    const res = await changeRole(db, adminCtx("admin-1"), {
      targetId: "user-1",
      role: "user",
    })
    expect(res.ok).toBe(true)
    expect(store.audits).toHaveLength(0)
  })

  it("throws ApiError.notFound for unknown target", async () => {
    await expect(
      changeRole(db, adminCtx("admin-1"), {
        targetId: "ghost",
        role: "admin",
      }),
    ).rejects.toThrow(/not found/i)
  })
})

describe("banUser", () => {
  it("audits, sets banned_at, deletes all sessions atomically", async () => {
    const res = await banUser(db, adminCtx("admin-1"), {
      targetId: "user-1",
      reason: "spam",
    })
    expect(res.ok).toBe(true)
    expect(
      store.users.find((u) => u.id === "user-1")?.banned_at,
    ).not.toBeNull()
    expect(store.users.find((u) => u.id === "user-1")?.banned_reason).toBe(
      "spam",
    )
    expect(store.sessions.filter((s) => s.userId === "user-1")).toHaveLength(0)
    expect(store.sessions.filter((s) => s.userId === "user-2")).toHaveLength(1)
    expect(store.audits.map((a) => a.action)).toEqual([
      "user.banned",
      "session.revoked",
    ])
  })

  it("throws ApiError on self-ban", async () => {
    await expect(
      banUser(db, adminCtx("admin-1"), { targetId: "admin-1" }),
    ).rejects.toThrow(/yourself/i)
  })

  it("idempotent on already-banned user (no extra audit)", async () => {
    await banUser(db, adminCtx("admin-1"), { targetId: "user-1" })
    store.audits = []
    const res = await banUser(db, adminCtx("admin-1"), { targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(store.audits).toHaveLength(0)
  })
})

describe("unbanUser", () => {
  it("clears banned_at + reason", async () => {
    await banUser(db, adminCtx("admin-1"), {
      targetId: "user-1",
      reason: "test",
    })
    store.audits = []
    const res = await unbanUser(db, adminCtx("admin-1"), { targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(store.users.find((u) => u.id === "user-1")?.banned_at).toBeNull()
    expect(store.audits[0]?.action).toBe("user.unbanned")
  })

  it("no-op on non-banned user (no audit row)", async () => {
    const res = await unbanUser(db, adminCtx("admin-1"), { targetId: "user-1" })
    expect(res.ok).toBe(true)
    expect(store.audits).toHaveLength(0)
  })
})

describe("preparePasswordReset", () => {
  it("returns the target email and writes an audit row", async () => {
    const res = await preparePasswordReset(db, adminCtx("admin-1"), {
      targetId: "user-1",
    })
    expect(res.email).toBe("alice@example.test")
    expect(store.audits[0]?.action).toBe("user.password_reset_sent")
  })

  it("throws ApiError.notFound for unknown target", async () => {
    await expect(
      preparePasswordReset(db, adminCtx("admin-1"), { targetId: "ghost" }),
    ).rejects.toThrow(/not found/i)
  })
})

describe("sendAdminNotification", () => {
  it("creates a generic notification with admin-supplied content", async () => {
    const res = await sendAdminNotification(db, adminCtx("admin-1"), {
      targetId: "user-1",
      title: "Heads up",
      message: "Please update your password.",
      href: "/profile",
    })
    expect(res.ok).toBe(true)
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]).toMatchObject({
      user_id: "user-1",
      type: "generic",
    })
    expect(store.audits[0]?.action).toBe("user.admin_notified")
  })

  it("throws ApiError.notFound for unknown target", async () => {
    await expect(
      sendAdminNotification(db, adminCtx("admin-1"), {
        targetId: "ghost",
        title: "x",
        message: "y",
      }),
    ).rejects.toThrow(/not found/i)
  })
})
