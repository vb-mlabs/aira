// @vitest-environment node
//
// Tests for getPostAuthorForEmail — chainable mock for the SELECT join.
// The helper is read-only and one-shot; full in-memory store is
// unnecessary.

import { describe, expect, it } from "vitest"
import type { Database } from "@aira/db/client"
import { getPostAuthorForEmail } from "../service"

function selectDb(row: unknown | undefined) {
  return {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve(row === undefined ? [] : [row]),
          }),
        }),
      }),
    }),
  } as unknown as Database
}

describe("getPostAuthorForEmail", () => {
  it("returns the author row with email + email_on_post_interest", async () => {
    const db = selectDb({
      user_id: "user-A",
      email: "a@example.test",
      email_on_post_interest: true,
    })
    await expect(getPostAuthorForEmail(db, "post_1")).resolves.toEqual({
      user_id: "user-A",
      email: "a@example.test",
      email_on_post_interest: true,
    })
  })

  it("returns null when the post is gone (race with delete)", async () => {
    const db = selectDb(undefined)
    await expect(getPostAuthorForEmail(db, "post_missing")).resolves.toBeNull()
  })

  it("surfaces opt-out preference so the op layer can skip the email", async () => {
    const db = selectDb({
      user_id: "user-A",
      email: "a@example.test",
      email_on_post_interest: false,
    })
    const result = await getPostAuthorForEmail(db, "post_1")
    expect(result?.email_on_post_interest).toBe(false)
  })
})
