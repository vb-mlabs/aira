// @mlabs/api/client — universal client entry point.
//
// Currently a stub: the mobile fetch client (token refresh, ApiError parsing)
// moves here in Phase 6 alongside the apps/mobile rewire. Web consumers don't
// need a separate client today (they call routes via fetch directly), but the
// subpath is exported so consumers can import from a stable path before the
// move lands.

export {} // intentionally empty for now
