// @vitest-environment node
//
// Mirrors admin-bootstrap.test.ts. Same contract (audit-before-action,
// case-insensitive match, no-op when email doesn't match) but for the
// super_admin promotion path.

import { describe, expect, it, vi } from "vitest"
import { createSuperAdminBootstrapHook } from "../super-admin-bootstrap"
import type { AuditFn, AuditOpts } from "@aira/db/audit"

function makeDb() {
  const setSpy = vi.fn<(values: unknown) => { where: (cond: unknown) => Promise<void> }>(
    () => ({
      where: vi.fn<(cond: unknown) => Promise<void>>(() => Promise.resolve()),
    }),
  )
  const updateSpy = vi.fn(() => ({ set: setSpy }))
  return {
    db: { update: updateSpy } as unknown as Parameters<typeof createSuperAdminBootstrapHook>[0]["db"],
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

describe("createSuperAdminBootstrapHook", () => {
  it("no-op when initialSuperAdminEmail is undefined", async () => {
    const { db, updateSpy } = makeDb()
    const { audit, calls } = makeAudit()
    const hook = createSuperAdminBootstrapHook({
      db,
      initialSuperAdminEmail: undefined,
      audit,
    })
    await hook({ id: "u_1", email: "anyone@example.test" })
    expect(updateSpy).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it("no-op when email doesn't match", async () => {
    const { db, updateSpy } = makeDb()
    const { audit, calls } = makeAudit()
    const hook = createSuperAdminBootstrapHook({
      db,
      initialSuperAdminEmail: "founder@example.test",
      audit,
    })
    await hook({ id: "u_1", email: "someone-else@example.test" })
    expect(updateSpy).not.toHaveBeenCalled()
    expect(calls).toHaveLength(0)
  })

  it("audits then updates with to=super_admin (audit-before-action)", async () => {
    const { db, updateSpy } = makeDb()
    const events: string[] = []
    const calls: AuditOpts[] = []
    const audit: AuditFn = async (opts) => {
      events.push("audit")
      calls.push(opts)
    }
    updateSpy.mockImplementation(() => {
      events.push("update")
      return {
        set: () => ({ where: () => Promise.resolve() }),
      }
    })
    const hook = createSuperAdminBootstrapHook({
      db,
      initialSuperAdminEmail: "founder@example.test",
      audit,
    })
    await hook({ id: "u_1", email: "founder@example.test" })
    expect(events).toEqual(["audit", "update"])
    expect(calls[0]).toMatchObject({
      actorId: null,
      action: "user.role_changed",
      target: { type: "user", id: "u_1" },
      meta: {
        kind: "user.role_changed",
        from: "end_user",
        to: "super_admin",
      },
    })
  })

  it("does not update when audit throws", async () => {
    const { db, updateSpy } = makeDb()
    const audit: AuditFn = async () => {
      throw new Error("audit failed")
    }
    const hook = createSuperAdminBootstrapHook({
      db,
      initialSuperAdminEmail: "founder@example.test",
      audit,
    })
    await expect(
      hook({ id: "u_1", email: "founder@example.test" }),
    ).rejects.toThrow(/audit failed/)
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
