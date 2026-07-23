// @vitest-environment node
//
// Cap-gate coverage for createPost + shape coverage for getMyPostLimits.
// Matches the lightweight chain-mock pattern used by
// packages/services/src/user-preferences/__tests__/service.test.ts —
// hand-rolled `db` that returns whatever the test wants for the
// count(*) query. Predicate correctness (status IN ('pending',
// 'approved') filtering — acceptance criterion (d) in the plan) is a
// Drizzle SQL-building concern that a chain-mock can't meaningfully
// verify; treated as a manual-repro acceptance line, not a unit test.

import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@aira/api"
import type { CallerContext } from "@aira/api/context"
import type { Database } from "@aira/db/client"
import { MAX_ACTIVE_POSTS_PER_USER } from "@aira/validators/community"
import { createPost, getMyPostLimits } from "../service"

function ctxFor(userId: string): CallerContext {
  return {
    userId,
    user: { id: userId, email: `${userId}@x.com`, role: "user" },
    requestId: "req-test",
    source: "web",
  } as CallerContext
}

/** Build a `db` whose select() chain resolves to [{ value: activeCount }]
 *  — matches how countActivePostsForUser reads its result. `insertSpy` (if
 *  provided) is invoked when createPost reaches the insert stage. Typed
 *  as a plain function rather than ReturnType<typeof vi.fn> because
 *  Vitest 4's Mock union type breaks TS's `?.(…)` optional-call
 *  narrowing. */
function makeDb(opts: {
  activeCount: number
  insertSpy?: (vals: Record<string, unknown>) => void
  postRow?: {
    id: string
    title: string
    body: string | null
    status: "pending"
    user_id: string
    author_name: string
    author_image: string | null
    phone: string | null
    email: string | null
    interest_count: number
    expires_at: Date | null
    approved_at: Date | null
    created_at: Date
  }
}): Database {
  const { activeCount, insertSpy, postRow } = opts
  // createPost calls two selects total: (1) the count, (2) getPost's
  // author-joined lookup after insert. Return a small state machine so
  // the first select resolves the count, and the second resolves the
  // post row. Both use the same `.from().where().limit()` shape;
  // getPost adds `.leftJoin()` between from and where.
  let selectCall = 0
  return {
    select: () => {
      const n = selectCall++
      // Count query — no leftJoin, resolves via just from().where().
      if (n === 0) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ value: activeCount }]),
          }),
        }
      }
      // getPost lookup — from().leftJoin().where().limit().
      return {
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve(postRow ? [postRow] : []),
            }),
          }),
        }),
      }
    },
    insert: () => ({
      values: (vals: Record<string, unknown>) => {
        insertSpy?.(vals)
        return {
          returning: () => Promise.resolve([{ id: "post-new" }]),
        }
      },
    }),
  } as unknown as Database
}

describe("createPost — active-post cap", () => {
  it("allows a first post when the user has 0 active", async () => {
    const insertSpy = vi.fn()
    const db = makeDb({
      activeCount: 0,
      insertSpy,
      postRow: {
        id: "post-new",
        title: "Hi",
        body: null,
        status: "pending",
        user_id: "u_1",
        author_name: "User One",
        author_image: null,
        phone: null,
        email: null,
        interest_count: 0,
        expires_at: null,
        approved_at: null,
        created_at: new Date(),
      },
    })
    await expect(
      createPost(db, ctxFor("u_1"), { title: "Hi" }),
    ).resolves.toEqual({ post: expect.objectContaining({ id: "post-new" }) })
    expect(insertSpy).toHaveBeenCalledOnce()
  })

  it("allows an additional post when the user has MAX-1 active", async () => {
    const insertSpy = vi.fn()
    const db = makeDb({
      activeCount: MAX_ACTIVE_POSTS_PER_USER - 1,
      insertSpy,
      postRow: {
        id: "post-new",
        title: "Third",
        body: null,
        status: "pending",
        user_id: "u_1",
        author_name: "User One",
        author_image: null,
        phone: null,
        email: null,
        interest_count: 0,
        expires_at: null,
        approved_at: null,
        created_at: new Date(),
      },
    })
    await expect(
      createPost(db, ctxFor("u_1"), { title: "Third" }),
    ).resolves.toBeDefined()
    expect(insertSpy).toHaveBeenCalledOnce()
  })

  it("throws community.active_post_exists at the cap", async () => {
    const insertSpy = vi.fn()
    const db = makeDb({
      activeCount: MAX_ACTIVE_POSTS_PER_USER,
      insertSpy,
    })
    await expect(
      createPost(db, ctxFor("u_1"), { title: "Four" }),
    ).rejects.toMatchObject({
      code: "community.active_post_exists",
      status: 409,
    })
    // Insert must never fire when the gate rejects — otherwise a race
    // could double-write.
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it("throws with an ApiError instance so the route handler serialises it", async () => {
    const db = makeDb({ activeCount: MAX_ACTIVE_POSTS_PER_USER })
    await expect(
      createPost(db, ctxFor("u_1"), { title: "Four" }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

describe("getMyPostLimits — shape", () => {
  it("returns { active, max, remaining } with remaining = max - active", async () => {
    const db = makeDb({ activeCount: 1 })
    await expect(getMyPostLimits(db, ctxFor("u_1"))).resolves.toEqual({
      active: 1,
      max: MAX_ACTIVE_POSTS_PER_USER,
      remaining: MAX_ACTIVE_POSTS_PER_USER - 1,
    })
  })

  it("returns remaining=0 when active === max", async () => {
    const db = makeDb({ activeCount: MAX_ACTIVE_POSTS_PER_USER })
    await expect(getMyPostLimits(db, ctxFor("u_1"))).resolves.toEqual({
      active: MAX_ACTIVE_POSTS_PER_USER,
      max: MAX_ACTIVE_POSTS_PER_USER,
      remaining: 0,
    })
  })

  it("clamps remaining at 0 when active > max (defensive)", async () => {
    // Shouldn't happen in practice — a rogue direct-DB insert bypasses
    // the gate — but the arithmetic must not underflow into a negative.
    const db = makeDb({ activeCount: MAX_ACTIVE_POSTS_PER_USER + 5 })
    await expect(getMyPostLimits(db, ctxFor("u_1"))).resolves.toMatchObject({
      remaining: 0,
    })
  })

  it("returns active=0 when the count query returns no rows", async () => {
    // Defensive: if the count SELECT ever returns [] (misconfigured
    // driver, transaction rollback race), fall back to 0 rather than
    // NaN or crash.
    const db = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    } as unknown as Database
    await expect(getMyPostLimits(db, ctxFor("u_1"))).resolves.toEqual({
      active: 0,
      max: MAX_ACTIVE_POSTS_PER_USER,
      remaining: MAX_ACTIVE_POSTS_PER_USER,
    })
  })
})
