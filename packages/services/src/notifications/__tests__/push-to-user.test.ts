// @vitest-environment node
//
// Unit tests for sendPushToUser. Mocks the two external boundaries
// (Expo SDK + devices queries) and asserts against the observable
// behaviour: delivery-log rows written, DeviceNotRegistered → cleanup,
// no-device / no-token short-circuits, abort timeout swallowed.

import { describe, expect, it, vi, beforeEach } from "vitest"

// vi.mock is hoisted; use vi.hoisted so the mock factories can reference
// these fns without a TDZ error.
const mocks = vi.hoisted(() => ({
  listDevicesForUserIds: vi.fn(),
  deleteDeviceById: vi.fn(),
  chunkPushNotifications: vi.fn((messages: unknown[]) => [messages]),
  sendPushNotificationsAsync: vi.fn(),
}))

vi.mock("../../devices", () => ({
  listDevicesForUserIds: mocks.listDevicesForUserIds,
  deleteDeviceById: mocks.deleteDeviceById,
}))

vi.mock("expo-server-sdk", () => ({
  Expo: class {
    chunkPushNotifications = mocks.chunkPushNotifications
    sendPushNotificationsAsync = mocks.sendPushNotificationsAsync
  },
}))

import { sendPushToUser } from "../push-to-user"
import type { Database } from "@aira/db/client"

// Minimal db mock — only db.insert(...).values(...) is exercised.
function mockDb(): { db: Database; deliveryValues: unknown[][] } {
  const deliveryValues: unknown[][] = []
  const db = {
    insert: () => ({
      values: (rows: unknown[]) => {
        deliveryValues.push(rows)
        return Promise.resolve()
      },
    }),
  } as unknown as Database
  return { db, deliveryValues }
}

const MSG = {
  title: "New comment on your post",
  body: "Alice: Nice writeup!",
  data: { kind: "post_comment", notification_id: "n-1", post_id: "p-1" },
  notification_id: "n-1",
}

beforeEach(() => {
  vi.clearAllMocks()
  // Re-arm the chunker; vi.clearAllMocks resets the implementation.
  mocks.chunkPushNotifications.mockImplementation((m: unknown[]) => [m])
})

describe("sendPushToUser", () => {
  it("short-circuits when the user has no registered devices", async () => {
    mocks.listDevicesForUserIds.mockResolvedValue([])
    const { db, deliveryValues } = mockDb()

    const result = await sendPushToUser(db, "u-1", MSG, {
      expoAccessToken: "token",
    })

    expect(result).toEqual({
      devices_attempted: 0,
      devices_completed: 0,
      devices_pending: 0,
    })
    expect(mocks.sendPushNotificationsAsync).not.toHaveBeenCalled()
    expect(deliveryValues).toHaveLength(0)
  })

  it("logs a warn and returns zeros when EXPO_ACCESS_TOKEN is missing", async () => {
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[xxx]",
        platform: "ios",
      },
    ])
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { db, deliveryValues } = mockDb()

    const result = await sendPushToUser(db, "u-1", MSG, {
      expoAccessToken: undefined,
    })

    expect(result).toEqual({
      devices_attempted: 0,
      devices_completed: 0,
      devices_pending: 0,
    })
    expect(warn).toHaveBeenCalledOnce()
    expect(mocks.sendPushNotificationsAsync).not.toHaveBeenCalled()
    expect(deliveryValues).toHaveLength(0)
    warn.mockRestore()
  })

  it("writes a delivery row per device on successful send", async () => {
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[xxx]",
        platform: "ios",
      },
      {
        id: "d-2",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[yyy]",
        platform: "android",
      },
    ])
    mocks.sendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "receipt-1" },
      { status: "ok", id: "receipt-2" },
    ])
    const { db, deliveryValues } = mockDb()

    const result = await sendPushToUser(db, "u-1", MSG, {
      expoAccessToken: "token",
    })

    expect(result.devices_attempted).toBe(2)
    expect(result.devices_completed).toBe(2)
    expect(deliveryValues).toHaveLength(1)
    expect(deliveryValues[0]).toHaveLength(2)
    expect(deliveryValues[0][0]).toMatchObject({
      notification_id: "n-1",
      user_device_id: "d-1",
      status: "pending",
      ticket_id: "receipt-1",
      error_code: null,
    })
    expect(mocks.deleteDeviceById).not.toHaveBeenCalled()
  })

  it("deletes the device when the ticket reports DeviceNotRegistered", async () => {
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[stale]",
        platform: "ios",
      },
    ])
    mocks.sendPushNotificationsAsync.mockResolvedValue([
      {
        status: "error",
        message: "…",
        details: { error: "DeviceNotRegistered" },
      },
    ])
    const { db, deliveryValues } = mockDb()

    const result = await sendPushToUser(db, "u-1", MSG, {
      expoAccessToken: "token",
    })

    expect(result.devices_completed).toBe(1)
    expect(deliveryValues[0][0]).toMatchObject({
      status: "error",
      ticket_id: null,
      error_code: "DeviceNotRegistered",
    })
    expect(mocks.deleteDeviceById).toHaveBeenCalledWith(
      expect.anything(),
      "d-1",
    )
  })

  it("swallows a network error from sendPushNotificationsAsync (chunk stays pending)", async () => {
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[xxx]",
        platform: "ios",
      },
    ])
    mocks.sendPushNotificationsAsync.mockRejectedValue(new Error("boom"))
    const { db, deliveryValues } = mockDb()

    const result = await sendPushToUser(db, "u-1", MSG, {
      expoAccessToken: "token",
    })

    expect(result.devices_attempted).toBe(1)
    expect(result.devices_completed).toBe(0)
    expect(result.devices_pending).toBe(1)
    expect(deliveryValues).toHaveLength(0)
  })

  it("does NOT throw when Expo cleanup deleteDeviceById itself throws", async () => {
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[stale]",
        platform: "ios",
      },
    ])
    mocks.sendPushNotificationsAsync.mockResolvedValue([
      {
        status: "error",
        message: "…",
        details: { error: "DeviceNotRegistered" },
      },
    ])
    mocks.deleteDeviceById.mockRejectedValue(new Error("db closed"))
    const { db } = mockDb()

    await expect(
      sendPushToUser(db, "u-1", MSG, { expoAccessToken: "token" }),
    ).resolves.toBeDefined()
  })
})
