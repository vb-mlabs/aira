// @aira/services/waitlist — admin reads + hard-delete for the pre-launch
// waitlist table. The public POST endpoint that captures signups stays
// in apps/web/src/app/api/v1/{waitlist,business-waitlist} and writes
// directly via Drizzle; this module is admin-only and never inserts.

export { listAdmin, getCounts, deleteWaitlistEntry } from "./service"
