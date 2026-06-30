// Devices domain — public surface.
//
// Operations at apps/web/src/server/operations/profile.ts wrap these into
// the /api/v1/profile/push-token route handler. sendPushBroadcast in
// ../notifications/push.ts consumes listDevicesForUserIds and
// deleteDeviceById for fan-out + cleanup.

export {
  registerDevice,
  unregisterDevice,
  listDevicesForUserIds,
  deleteDeviceById,
} from "./queries";
