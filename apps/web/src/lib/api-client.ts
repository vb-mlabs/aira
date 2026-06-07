// Web's @aira/api/client composition root.
//
// Client Components import `apiClient` from here to mutate via `/api/v1/*`
// (e.g. apiClient.post("/api/v1/notifications/[id]/read")). Server
// Components don't use this — they call apiServerFetch from @aira/api/server
// for in-process op invocation. See CLAUDE.md "API surface" + the rest-api
// migration review for the reasoning.
//
// Web rides on cookies via `credentials: "include"` (the default for
// same-origin requests, set explicitly by createApiClient). No token deps,
// no refresh loop — Better Auth's cookie session handles all of that
// upstream. clientId: "web" feeds the X-Client header so server-side audit
// can attribute correctly.

import { createApiClient } from "@aira/api/client"

export const apiClient = createApiClient({
  baseUrl: "",
  clientId: "web",
})
