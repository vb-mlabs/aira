// @vitest-environment node
//
// Unit tests for sendUserPushBroadcast. Mocks the three external
// boundaries (Expo SDK, ../devices, ../admin sendUserBroadcast) and
// asserts against the per-platform bucketing that's the whole point
// of the module.

import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  sendUserBroadcast: vi.fn(),
  listDevicesForUserIds: vi.fn(),
  deleteDeviceById: vi.fn(),
  chunkPushNotifications: vi.fn((messages: unknown[]) => [messages]),
  sendPushNotificationsAsync: vi.fn(),
}))

vi.mock("../../admin", () => ({
  sendUserBroadcast: mocks.sendUserBroadcast,
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

import { sendUserPushBroadcast } from "../push-users"
import type { Database } from "@aira/db/client"
import type { CallerContext } from "@aira/api/context"

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

const CTX = { userId: "admin-1", source: "web" } as unknown as CallerContext

const ARGS_ALL = {
  title: "Site maintenance",
  message: "We'll be down for 5 minutes",
  target: { kind: "all_users_with_device" as const },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.chunkPushNotifications.mockImplementation((m: unknown[]) => [m])
})

describe("sendUserPushBroadcast", () => {
  it("short-circuits when the audience is empty", async () => {
    mocks.sendUserBroadcast.mockResolvedValue({
      recipient_count: 0,
      notifications: [],
    })
    const { db, deliveryValues } = mockDb()

    const result = await sendUserPushBroadcast(db, CTX, ARGS_ALL, {
      expoAccessToken: "token",
    })

    expect(result).toEqual({
      ok: true,
      recipient_count: 0,
      by_platform: {
        ios: { devices_attempted: 0, devices_completed: 0, devices_pending: 0 },
        android: {
          devices_attempted: 0,
          devices_completed: 0,
          devices_pending: 0,
        },
      },
      error_code_counts: {},
    })
    expect(mocks.sendPushNotificationsAsync).not.toHaveBeenCalled()
    expect(deliveryValues).toHaveLength(0)
  })

  it("returns zeros without throwing when recipients exist but have no devices", async () => {
    mocks.sendUserBroadcast.mockResolvedValue({
      recipient_count: 1,
      notifications: [{ user_id: "u-1", notification_id: "n-1" }],
    })
    mocks.listDevicesForUserIds.mockResolvedValue([])
    const { db } = mockDb()

    const result = await sendUserPushBroadcast(db, CTX, ARGS_ALL, {
      expoAccessToken: "token",
    })

    expect(result.by_platform.ios.devices_attempted).toBe(0)
    expect(result.by_platform.android.devices_attempted).toBe(0)
    expect(mocks.sendPushNotificationsAsync).not.toHaveBeenCalled()
  })

  it("throws when devices exist but EXPO_ACCESS_TOKEN is missing", async () => {
    // The whole point of this module is delivery triage — silent
    // log-and-return would let an admin conclude "0 pushed" when in
    // truth the token was missing. Explicit throw is intentional.
    mocks.sendUserBroadcast.mockResolvedValue({
      recipient_count: 1,
      notifications: [{ user_id: "u-1", notification_id: "n-1" }],
    })
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[xxx]",
        platform: "ios",
      },
    ])
    const { db } = mockDb()

    await expect(
      sendUserPushBroadcast(db, CTX, ARGS_ALL, {
        expoAccessToken: undefined,
      }),
    ).rejects.toThrow(/EXPO_ACCESS_TOKEN/)
  })

  it("buckets a mixed-platform response into iOS/Android counts + error codes", async () => {
    mocks.sendUserBroadcast.mockResolvedValue({
      recipient_count: 2,
      notifications: [
        { user_id: "u-1", notification_id: "n-1" },
        { user_id: "u-2", notification_id: "n-2" },
      ],
    })
    // 3 devices: 2 iOS (one stale), 1 Android (delivered).
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-ios-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[ios1]",
        platform: "ios",
      },
      {
        id: "d-ios-stale",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[iosStale]",
        platform: "ios",
      },
      {
        id: "d-android-1",
        user_id: "u-2",
        expo_push_token: "ExponentPushToken[android1]",
        platform: "android",
      },
    ])
    mocks.sendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "receipt-ios-1" },
      {
        status: "error",
        message: "…",
        details: { error: "DeviceNotRegistered" },
      },
      { status: "ok", id: "receipt-android-1" },
    ])
    const { db, deliveryValues } = mockDb()

    const result = await sendUserPushBroadcast(db, CTX, ARGS_ALL, {
      expoAccessToken: "token",
    })

    expect(result.by_platform.ios).toEqual({
      devices_attempted: 2,
      devices_completed: 2,
      devices_pending: 0,
    })
    expect(result.by_platform.android).toEqual({
      devices_attempted: 1,
      devices_completed: 1,
      devices_pending: 0,
    })
    expect(result.error_code_counts).toEqual({ DeviceNotRegistered: 1 })
    expect(deliveryValues).toHaveLength(1)
    expect(deliveryValues[0]).toHaveLength(3)
    // Stale iOS device queued for cleanup outside the transaction.
    expect(mocks.deleteDeviceById).toHaveBeenCalledWith(
      expect.anything(),
      "d-ios-stale",
    )
  })

  it("filters device fan-out by platform when target.kind === 'by_platform'", async () => {
    // User has an iOS AND an Android device. Target is iOS-only —
    // Android device should NOT receive the push.
    mocks.sendUserBroadcast.mockResolvedValue({
      recipient_count: 1,
      notifications: [{ user_id: "u-1", notification_id: "n-1" }],
    })
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-ios-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[ios1]",
        platform: "ios",
      },
      {
        id: "d-android-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[android1]",
        platform: "android",
      },
    ])
    mocks.sendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "receipt-ios-1" },
    ])
    const { db } = mockDb()

    const result = await sendUserPushBroadcast(
      db,
      CTX,
      {
        ...ARGS_ALL,
        target: { kind: "by_platform" as const, platform: "ios" as const },
      },
      { expoAccessToken: "token" },
    )

    expect(result.by_platform.ios.devices_attempted).toBe(1)
    expect(result.by_platform.ios.devices_completed).toBe(1)
    expect(result.by_platform.android.devices_attempted).toBe(0)
    // sendPushNotificationsAsync should have been called with ONE
    // message only — the Android device was filtered out before send.
    const [sentChunk] = mocks.sendPushNotificationsAsync.mock.calls[0] as [
      unknown[],
    ]
    expect(sentChunk).toHaveLength(1)
  })

  it("counts network-failed chunk as pending, split by platform", async () => {
    mocks.sendUserBroadcast.mockResolvedValue({
      recipient_count: 2,
      notifications: [
        { user_id: "u-1", notification_id: "n-1" },
        { user_id: "u-2", notification_id: "n-2" },
      ],
    })
    mocks.listDevicesForUserIds.mockResolvedValue([
      {
        id: "d-ios-1",
        user_id: "u-1",
        expo_push_token: "ExponentPushToken[ios1]",
        platform: "ios",
      },
      {
        id: "d-android-1",
        user_id: "u-2",
        expo_push_token: "ExponentPushToken[android1]",
        platform: "android",
      },
    ])
    mocks.sendPushNotificationsAsync.mockRejectedValue(new Error("network"))
    const { db, deliveryValues } = mockDb()

    const result = await sendUserPushBroadcast(db, CTX, ARGS_ALL, {
      expoAccessToken: "token",
    })

    expect(result.by_platform.ios).toEqual({
      devices_attempted: 1,
      devices_completed: 0,
      devices_pending: 1,
    })
    expect(result.by_platform.android).toEqual({
      devices_attempted: 1,
      devices_completed: 0,
      devices_pending: 1,
    })
    expect(deliveryValues).toHaveLength(0)
  })
})
