// @vitest-environment node
//
// Unit tests for the user-preferences service. Hand-rolled mock db
// captures the chained Drizzle calls — matches the lightweight pattern
// used by notifications/__tests__/service.test.ts.

import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@aira/api"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"
import { getPreferences, updatePreferences } from "../service"

function ctxFor(userId: string): CallerContext {
  return {
    userId,
    user: { id: userId, email: `${userId}@x.com`, role: "user" },
    requestId: "req-test",
    source: "web",
  } as CallerContext
}

function selectDb(row: unknown) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(row === undefined ? [] : [row]),
        }),
      }),
    }),
  } as unknown as Database
}

describe("getPreferences", () => {
  it("returns the row wrapped in { preferences }", async () => {
    const db = selectDb({
      email_on_message_received: false,
      email_on_post_interest: true,
    })
    await expect(getPreferences(db, ctxFor("u_1"))).resolves.toEqual({
      preferences: {
        email_on_message_received: false,
        email_on_post_interest: true,
      },
    })
  })

  it("throws ApiError.unauthorized() when the user row is gone", async () => {
    const db = selectDb(undefined)
    await expect(getPreferences(db, ctxFor("u_missing"))).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})

describe("updatePreferences", () => {
  it("writes only the columns explicitly set, leaving the other untouched", async () => {
    const setSpy = vi.fn().mockReturnValue({
      where: () => ({
        returning: () =>
          Promise.resolve([
            {
              email_on_message_received: false,
              email_on_post_interest: true,
            },
          ]),
      }),
    })
    const db = {
      update: () => ({ set: setSpy }),
    } as unknown as Database

    const result = await updatePreferences(db, ctxFor("u_1"), {
      email_on_message_received: false,
    })

    expect(setSpy).toHaveBeenCalledWith({ email_on_message_received: false })
    expect(result).toEqual({
      preferences: {
        email_on_message_received: false,
        email_on_post_interest: true,
      },
    })
  })

  it("no-ops on an empty body — re-reads via getPreferences", async () => {
    // Empty body skips the .update() call entirely (verified by no
    // update spy fire). The fallback read returns the existing row.
    const updateSpy = vi.fn()
    const db = {
      update: updateSpy,
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  email_on_message_received: true,
                  email_on_post_interest: true,
                },
              ]),
          }),
        }),
      }),
    } as unknown as Database

    const result = await updatePreferences(db, ctxFor("u_1"), {})
    expect(updateSpy).not.toHaveBeenCalled()
    expect(result.preferences.email_on_message_received).toBe(true)
    expect(result.preferences.email_on_post_interest).toBe(true)
  })

  it("scopes the write to ctx.userId (the predicate runs once per call)", async () => {
    const where = vi.fn().mockReturnValue({
      returning: () =>
        Promise.resolve([
          {
            email_on_message_received: true,
            email_on_post_interest: false,
          },
        ]),
    })
    const db = {
      update: () => ({ set: () => ({ where }) }),
    } as unknown as Database

    await updatePreferences(db, ctxFor("u_specific"), {
      email_on_post_interest: false,
    })
    expect(where).toHaveBeenCalledTimes(1)
  })
})
