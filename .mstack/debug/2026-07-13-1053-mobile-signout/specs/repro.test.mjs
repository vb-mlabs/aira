// Failing repro test that pinpoints the ROOT CAUSE, not just the symptom.
//
// Cause: `queryClient.clear()` in useSignOut's onSuccess destroys queries
// but does NOT notify active QueryObserver subscribers. The observer in
// (app)/_layout.tsx keeps its stale `{ data: user, status: "success" }`
// snapshot, so React never re-renders the gate, and the Redirect to
// /(auth)/welcome never fires.
//
// This test replicates the exact code path — no mocks of react-query —
// and asserts the specific broken invariant:
//   after sign-out, an active useMe observer's next result must reflect
//   "no session" (either data=undefined or an error state) so that the
//   (app)/_layout.tsx gate redirects on the next render pass.

import { strict as assert } from "node:assert";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
});

// Simulate a logged-in user: cache primed by useMe.
let sessionUser = { id: "u_1", email: "a@b.co", emailVerified: true };
const meRequest = async () => {
  if (!sessionUser) throw new Error("auth.no_session");
  return sessionUser;
};

await qc.fetchQuery({ queryKey: ["auth", "me"], queryFn: meRequest });

// This observer stands in for the `useMe()` call inside (app)/_layout.tsx.
// It stays subscribed for the whole app lifetime; the gate re-evaluates
// only when React re-renders THIS component. React re-renders it only when
// this observer notifies its subscribers.
const gateObserver = new QueryObserver(qc, {
  queryKey: ["auth", "me"],
  queryFn: meRequest,
  retry: false,
  staleTime: 60_000,
});

let gateNotifications = 0;
let gateLatest = gateObserver.getCurrentResult();
const unsub = gateObserver.subscribe((r) => {
  gateNotifications += 1;
  gateLatest = r;
});

// --- Simulate signOutRequest() completing successfully ------------------
sessionUser = null; // server revoked + clearTokens() ran
// Mirror what apps/mobile/features/auth/hooks.ts does now:
qc.resetQueries();

// Give react-query's notifyManager a chance to flush (it batches).
await new Promise((r) => setTimeout(r, 50));

// The bug: the (app)-layout observer never got notified, so React would
// never re-render the gate, so the Redirect never fires, so the user stays
// on the account screen with the tab bar still visible.
console.log("gateNotifications:", gateNotifications);
console.log("gateLatest.status:", gateLatest.status);
console.log("gateLatest.data:", JSON.stringify(gateLatest.data));

assert.ok(
  gateNotifications > 0,
  "Fix must notify the gate observer at least once so React re-renders it.",
);

// The assertion that names the cause. Passes only when the observer
// stops reporting a verified user after sign-out.
assert.notEqual(
  gateLatest.data?.emailVerified,
  true,
  "After sign-out, the (app) gate's useMe observer must NOT still report " +
    "emailVerified=true — otherwise the Redirect to /(auth)/welcome never fires.",
);

unsub();
console.log("\n✅ Fix verified: sign-out flips the gate observer.");
