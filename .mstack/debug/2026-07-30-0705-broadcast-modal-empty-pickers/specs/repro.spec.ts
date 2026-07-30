// Pinpoints the *cause* of the Notify Business popup empty-dropdown bug.
//
// The modal fires all three picker loads in a single Promise.all
// (business-broadcast-modal.tsx:103-111). One member of that batch is
// GET /api/v1/admin/businesses. The route file at
// apps/web/src/app/api/v1/admin/businesses/route.ts only exports POST
// (create), so GET returns 405 Method Not Allowed. Promise.all fails-fast
// on the 405, and the modal's catch block silently swallows it — all three
// arrays stay [], and users see empty select + two frozen "Loading…" panes.
//
// Asserts the cause directly: the route module MUST export a GET handler.
// Fails today, passes once the route wires a listAllBusinessesAdminOp GET.

import { describe, it, expect } from "vitest"
import * as adminBusinessesRoute from "../../../../apps/web/src/app/api/v1/admin/businesses/route"

describe("GET /api/v1/admin/businesses handler", () => {
  it("exports a GET handler so the broadcast modal's Promise.all does not 405", () => {
    expect(
      typeof (adminBusinessesRoute as Record<string, unknown>).GET,
    ).toBe("function")
  })
})
