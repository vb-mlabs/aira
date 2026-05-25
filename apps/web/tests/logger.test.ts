import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the db module BEFORE importing the logger so it captures the import
const insertMock = vi.fn()
vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: insertMock,
    }),
  },
}))

import { logger } from "@/lib/logger"

beforeEach(() => {
  insertMock.mockReset()
  insertMock.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("logger", () => {
  it("info logs to console but does NOT persist", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    logger.info("server started", { port: 3000 })

    expect(spy).toHaveBeenCalledWith({
      level: "info",
      message: "server started",
      port: 3000,
    })
    expect(insertMock).not.toHaveBeenCalled()
  })

  it("warn logs AND persists to error_log", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("session almost expired", { userId: "u1" })

    // wait for the void persist promise to flush
    await new Promise((r) => setTimeout(r, 0))
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalledWith({
      level: "warn",
      message: "session almost expired",
      meta: { userId: "u1" },
    })
  })

  it("error logs AND persists with level=error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    logger.error("upload failed", { key: "avatars/x.jpg" })

    await new Promise((r) => setTimeout(r, 0))
    expect(insertMock).toHaveBeenCalledWith({
      level: "error",
      message: "upload failed",
      meta: { key: "avatars/x.jpg" },
    })
  })

  it("persistence failure does NOT throw — logger swallows it", async () => {
    insertMock.mockRejectedValueOnce(new Error("db down"))
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => logger.error("upload failed")).not.toThrow()

    // Wait for the inner persist + its own catch
    await new Promise((r) => setTimeout(r, 0))
    // Two console.error calls: original logger.error, then the persist-failure catch
    expect(consoleErr).toHaveBeenCalledTimes(2)
  })
})
