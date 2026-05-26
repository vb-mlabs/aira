// @vitest-environment node
//
// Bootstrap hook tests — verify the audit-before-action contract: the
// audit row gets written BEFORE the role UPDATE, so a failed audit blocks
// the promotion (clean — no role change + no false audit row). Mocks the
// db client and audit fn; doesn't exercise Drizzle or Postgres.

import { describe, expect, it, vi } from "vitest"
import { createAdminBootstrapHook } from "../admin-bootstrap"
import type { AuditFn, AuditOpts } from "@aira/db/audit"

// Minimal db stub — only .update().set().where() needs to be chainable. We
// record the call args on a spy so tests can assert ordering vs the audit
// call.
function makeDb() {
  const setSpy = vi.fn<(values: unknown) => { where: (cond: unknown) => Promise<void> }>(
    () => ({
      where: vi.fn<(cond: unknown) => Promise<void>>(() => Promise.resolve()),
    }),
  )
  const updateSpy = vi.fn(() => ({ set: setSpy }))
  return {
    db: { update: updateSpy } as unknown as Parameters<typeof createAdminBootstrapHook>[0]["db"],
    updateSpy,
    setSpy,
  }
}

function makeAudit(): { audit: AuditFn; calls: AuditOpts[] } {
  const calls: AuditOpts[] = []
  const audit: AuditFn = async (opts) => {
    calls.push(opts)
  }
  return { audit, calls }
}

describe("createAdminBootstrapHook", () => {
  it("no-op when initialAdminEmail is undefined", async () => {
    const { db, updateSpy } = makeDb()
    const { audit, calls } = makeAudit()
    const hook = createAdminBootstrapHook({
      db,
      initialAdminEmail: undefined,
      audit,
    })
    await hook({ id: "u_1", email: "anyone@example.test" })
    expect(updateSpy).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it("no-op when email doesn't match the bootstrap value", async () => {
    const { db, updateSpy } = makeDb()
    const { audit, calls } = makeAudit()
    const hook = createAdminBootstrapHook({
      db,
      initialAdminEmail: "boss@example.test",
      audit,
    })
    await hook({ id: "u_1", email: "someone-else@example.test" })
    expect(updateSpy).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it("matches case-insensitively (lowercases both sides)", async () => {
    const { db, updateSpy } = makeDb()
    const { audit, calls } = makeAudit()
    const hook = createAdminBootstrapHook({
      db,
      initialAdminEmail: "Boss@Example.Test",
      audit,
    })
    await hook({ id: "u_1", email: "BOSS@example.test" })
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(calls).toHaveLength(1)
  })

  it("audits before updating (audit-before-action)", async () => {
    const { db, updateSpy } = makeDb()
    const events: string[] = []
    const audit: AuditFn = async () => {
      events.push("audit")
    }
    updateSpy.mockImplementation(() => {
      events.push("update")
      return {
        set: () => ({ where: () => Promise.resolve() }),
      }
    })
    const hook = createAdminBootstrapHook({
      db,
      initialAdminEmail: "boss@example.test",
      audit,
    })
    await hook({ id: "u_1", email: "boss@example.test" })
    expect(events).toEqual(["audit", "update"])
  })

  it("writes a user.role_changed audit with actor_id=null and from/to", async () => {
    const { db } = makeDb()
    const { audit, calls } = makeAudit()
    const hook = createAdminBootstrapHook({
      db,
      initialAdminEmail: "boss@example.test",
      audit,
    })
    await hook({ id: "u_1", email: "boss@example.test" })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      actorId: null,
      action: "user.role_changed",
      target: { type: "user", id: "u_1" },
      meta: {
        kind: "user.role_changed",
        from: "end_user",
        to: "admin",
      },
    })
  })

  it("does not update when audit throws (clean rollback)", async () => {
    const { db, updateSpy } = makeDb()
    const audit: AuditFn = async () => {
      throw new Error("audit failed")
    }
    const hook = createAdminBootstrapHook({
      db,
      initialAdminEmail: "boss@example.test",
      audit,
    })
    await expect(
      hook({ id: "u_1", email: "boss@example.test" }),
    ).rejects.toThrow(/audit failed/)
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
