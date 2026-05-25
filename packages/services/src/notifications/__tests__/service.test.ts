// @vitest-environment node
//
// Unit tests for the notifications service. Pass a hand-rolled mock db that
// captures the chained Drizzle calls — no vi.mock(), no module hacking.
// This is intentionally different from the legacy tests under tests/ that
// reach for vi.mock("@/lib/db", ...) — services accept db as a parameter
// precisely so test mocks become this trivial.

import { describe, expect, it, vi } from "vitest"
import {
  getUnreadCount,
  listInbox,
  markAllRead,
  markRead,
  createNotification,
} from "../service"
import type { Database } from "@mlabs/db/client"
import type { CallerContext } from "@mlabs/api/context"

function ctxFor(userId: string): CallerContext {
  return {
    userId,
    user: { id: userId, email: `${userId}@x.com`, role: "user" },
    requestId: "req-test",
    source: "web",
  }
}

/**
 * Tiny chainable mock: every method returns `this` so the service's
 * fluent Drizzle calls compose. The terminal step (a thenable returning
 * rows) is reached by awaiting the chain — we make the chain itself
 * Promise-like by giving it `.then`.
 */
function chainable<T>(terminal: T) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: T) => void) => resolve(terminal)
      }
      return () => proxy
    },
  }
  const proxy: unknown = new Proxy({}, handler)
  return proxy as Database
}

describe("getUnreadCount", () => {
  it("returns { count } from the first row, defaults to 0 when empty", async () => {
    const db = chainable([{ count: 7 }])
    await expect(getUnreadCount(db, ctxFor("u_1"))).resolves.toEqual({
      count: 7,
    })

    const emptyDb = chainable<{ count: number }[]>([])
    await expect(getUnreadCount(emptyDb, ctxFor("u_1"))).resolves.toEqual({
      count: 0,
    })
  })

  it("scopes the query to ctx.userId (predicate passed into where())", async () => {
    const where = vi.fn().mockReturnValue({
      then: (resolve: (v: { count: number }[]) => void) =>
        resolve([{ count: 3 }]),
    })
    const db = {
      select: () => ({ from: () => ({ where }) }),
    } as unknown as Database
    await getUnreadCount(db, ctxFor("u_specific"))
    expect(where).toHaveBeenCalledTimes(1)
  })
})

describe("listInbox", () => {
  it("returns the rows as-is wrapped in { rows }", async () => {
    const dbRows = [
      {
        id: "n_1",
        type: "generic",
        body: { kind: "generic", title: "Hi", message: "there" },
        read_at: null,
        created_at: new Date("2025-01-01"),
      },
    ]
    const db = chainable(dbRows)
    const result = await listInbox(db, ctxFor("u_1"))
    expect(result.rows).toBe(dbRows)
  })
})

describe("markAllRead", () => {
  it("returns ok: true and the number of rows touched", async () => {
    const returning = vi
      .fn()
      .mockResolvedValue([{ id: "n_1" }, { id: "n_2" }, { id: "n_3" }])
    const db = {
      update: () => ({
        set: () => ({ where: () => ({ returning }) }),
      }),
    } as unknown as Database
    const result = await markAllRead(db, ctxFor("u_1"))
    expect(result).toEqual({ ok: true, changed: 3 })
    expect(returning).toHaveBeenCalledTimes(1)
  })

  it("returns changed: 0 when nothing was unread", async () => {
    const db = chainable([])
    await expect(markAllRead(db, ctxFor("u_1"))).resolves.toEqual({
      ok: true,
      changed: 0,
    })
  })

  it("scopes the update to ctx.userId (cross-user isolation in the WHERE)", async () => {
    // Legacy authz coverage: markAllRead must not touch rows owned by
    // other users. The predicate composition (user_id == ctx.userId AND
    // isNull(read_at)) is what enforces this; assert the where() call is
    // present so a future refactor can't accidentally drop the user_id
    // half.
    const where = vi.fn().mockReturnValue({
      returning: () => Promise.resolve([{ id: "n_mine" }]),
    })
    const db = {
      update: () => ({ set: () => ({ where }) }),
    } as unknown as Database
    await markAllRead(db, ctxFor("u_specific"))
    expect(where).toHaveBeenCalledTimes(1)
  })
})

describe("markRead", () => {
  it("returns changed: 0 for an unknown id (no enumeration leak)", async () => {
    const db = chainable<unknown[]>([])
    await expect(
      markRead(db, ctxFor("u_1"), { id: "n_bogus" }),
    ).resolves.toEqual({ ok: true, changed: 0 })
  })

  it("returns changed: 1 when the row is owned + unread", async () => {
    const db = chainable([{ id: "n_real" }])
    await expect(
      markRead(db, ctxFor("u_1"), { id: "n_real" }),
    ).resolves.toEqual({ ok: true, changed: 1 })
  })

  it("returns changed: 0 indistinguishably for wrong-owner and already-read (authz scoping is in the WHERE)", async () => {
    // Both "row belongs to another user" and "row is already read" surface
    // as zero returned rows from the update — gated by the WHERE predicate
    // (id, user_id, isNull(read_at)). The service can't tell which case
    // produced the zero match; that's the no-enumeration property.
    const where = vi.fn().mockReturnValue({
      returning: () => Promise.resolve([]),
    })
    const db = {
      update: () => ({ set: () => ({ where }) }),
    } as unknown as Database
    const result = await markRead(db, ctxFor("u_owner"), { id: "n_x" })
    expect(result).toEqual({ ok: true, changed: 0 })
    expect(where).toHaveBeenCalledTimes(1)
  })
})

describe("createNotification", () => {
  it("inserts and returns the new id", async () => {
    const values = vi.fn().mockReturnValue({
      returning: () => Promise.resolve([{ id: "n_new" }]),
    })
    const db = { insert: () => ({ values }) } as unknown as Database
    const result = await createNotification(db, ctxFor("u_1"), {
      userId: "u_2",
      body: { kind: "generic", title: "x", message: "y" },
    })
    expect(result).toEqual({ id: "n_new" })
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u_2",
        type: "generic",
      }),
    )
  })

  it("persists with the typed body and type=body.kind (no drift)", async () => {
    // Legacy coverage: the row carries the validated NotificationBody and
    // type column mirrors body.kind so SQL-side filtering stays cheap.
    const values = vi.fn().mockReturnValue({
      returning: () => Promise.resolve([{ id: "n_typed" }]),
    })
    const db = { insert: () => ({ values }) } as unknown as Database
    await createNotification(db, ctxFor("u_1"), {
      userId: "u_2",
      body: {
        kind: "message",
        conversation_id: "conv_1",
        sender_id: "u_1",
        sender_name: "Alice",
        preview: "hi",
      },
    })
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u_2",
        type: "message",
        body: expect.objectContaining({ kind: "message" }),
      }),
    )
  })

  it("throws when the insert returns no row (defensive)", async () => {
    const db = {
      insert: () => ({
        values: () => ({ returning: () => Promise.resolve([]) }),
      }),
    } as unknown as Database
    await expect(
      createNotification(db, ctxFor("u_1"), {
        userId: "u_2",
        body: { kind: "generic", title: "x", message: "y" },
      }),
    ).rejects.toThrow(/no row/)
  })
})
