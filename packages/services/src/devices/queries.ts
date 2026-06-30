// User device registry — read/write queries for the user_device table.
//
// Pure: takes `db` as the first argument; no auth (the op layer enforces
// `permission: "user"` before invoking these). Mirrors the @aira/services
// convention.
//
// last_seen_at bumps on every successful re-register; the
// DeviceNotRegistered cleanup path on broadcasts deletes by id (see
// sendPushBroadcast in ../notifications/push.ts).

import { and, eq, inArray } from "drizzle-orm";
import { userDevice } from "@aira/db/schema";
import type { Database } from "@aira/db/client";
import type { DevicePlatform } from "@aira/validators";

/** Upsert keyed on (user_id, expo_push_token). A subsequent re-register
 *  bumps last_seen_at and updates platform (a device that switches OS
 *  major versions can shift platform reporting). Idempotent. */
export async function registerDevice(
  db: Database,
  userId: string,
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await db
    .insert(userDevice)
    .values({
      user_id: userId,
      expo_push_token: token,
      platform,
    })
    .onConflictDoUpdate({
      target: [userDevice.user_id, userDevice.expo_push_token],
      set: {
        last_seen_at: new Date(),
        platform,
      },
    });
}

/** Delete by (user_id, expo_push_token). Idempotent — unregistering a
 *  device that's already gone succeeds silently. */
export async function unregisterDevice(
  db: Database,
  userId: string,
  token: string,
): Promise<void> {
  await db
    .delete(userDevice)
    .where(
      and(
        eq(userDevice.user_id, userId),
        eq(userDevice.expo_push_token, token),
      ),
    );
}

/** Fan-out lookup: every registered device for the resolved recipient set.
 *  Empty input short-circuits to an empty array — avoids a no-op SQL
 *  round-trip on zero-recipient broadcasts. */
export async function listDevicesForUserIds(
  db: Database,
  userIds: string[],
): Promise<
  Array<{
    id: string;
    user_id: string;
    expo_push_token: string;
    platform: string;
  }>
> {
  if (userIds.length === 0) return [];
  return db
    .select({
      id: userDevice.id,
      user_id: userDevice.user_id,
      expo_push_token: userDevice.expo_push_token,
      platform: userDevice.platform,
    })
    .from(userDevice)
    .where(inArray(userDevice.user_id, userIds));
}

/** Delete by row id. Used by the DeviceNotRegistered cleanup pass after
 *  a broadcast (outside the broadcast transaction per F21 review decision
 *  9 — best-effort, idempotent). */
export async function deleteDeviceById(
  db: Database,
  deviceId: string,
): Promise<void> {
  await db.delete(userDevice).where(eq(userDevice.id, deviceId));
}
