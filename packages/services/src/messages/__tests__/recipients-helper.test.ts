// @vitest-environment node
//
// Tests for listMessageRecipientsForEmail — kept in a separate file so the
// chainable mock here doesn't have to interact with the in-memory store
// the main service.test.ts uses. The helper is a pure SELECT join; a
// one-shot mock returning the join rows is sufficient.

import { describe, expect, it, vi } from "vitest"
import type { Database } from "@aira/db/client"
import { listMessageRecipientsForEmail } from "../service"

function selectDb(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
    }),
  } as unknown as Database
}

describe("listMessageRecipientsForEmail", () => {
  it("returns the rows projected by the SELECT (one row per other participant)", async () => {
    const db = selectDb([
      {
        user_id: "user-B",
        email: "b@example.test",
        email_on_message_received: true,
      },
    ])
    const result = await listMessageRecipientsForEmail(db, "conv_1", "user-A")
    expect(result).toEqual([
      {
        user_id: "user-B",
        email: "b@example.test",
        email_on_message_received: true,
      },
    ])
  })

  it("returns an empty array when no recipients (orphaned 1:1 / sender-only conv)", async () => {
    const db = selectDb([])
    const result = await listMessageRecipientsForEmail(db, "conv_1", "user-A")
    expect(result).toEqual([])
  })

  it("passes through opt-out preference unchanged so the op layer can skip the send", async () => {
    const db = selectDb([
      {
        user_id: "user-B",
        email: "b@example.test",
        email_on_message_received: false,
      },
    ])
    const result = await listMessageRecipientsForEmail(db, "conv_1", "user-A")
    expect(result[0]!.email_on_message_received).toBe(false)
  })

  it("invokes the WHERE predicate once per call (the excludeUserId filter)", async () => {
    const where = vi.fn().mockReturnValue(Promise.resolve([]))
    const db = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({ where }),
        }),
      }),
    } as unknown as Database
    await listMessageRecipientsForEmail(db, "conv_1", "user-A")
    expect(where).toHaveBeenCalledTimes(1)
  })
})
