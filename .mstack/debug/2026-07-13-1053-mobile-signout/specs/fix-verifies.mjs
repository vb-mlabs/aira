// Proves the proposed fix — replacing `qc.clear()` with
// `qc.resetQueries()` (or wrapping in onSettled) — makes the same assertion
// pass. Ran after repro.test.mjs to confirm the fix is correct.

import { strict as assert } from "node:assert";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
});

let sessionUser = { id: "u_1", email: "a@b.co", emailVerified: true };
const meRequest = async () => {
  if (!sessionUser) throw new Error("auth.no_session");
  return sessionUser;
};

await qc.fetchQuery({ queryKey: ["auth", "me"], queryFn: meRequest });

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

sessionUser = null;

// ---- THE FIX ----
qc.resetQueries();
// -----------------

await new Promise((r) => setTimeout(r, 100));

console.log("gateNotifications:", gateNotifications);
console.log("gateLatest.status:", gateLatest.status);
console.log("gateLatest.data:", JSON.stringify(gateLatest.data));
console.log("gateLatest.error:", gateLatest.error?.message);

assert.ok(
  gateNotifications > 0,
  "Fix must notify the gate observer at least once so React re-renders it.",
);

assert.ok(
  gateLatest.status === "error" ||
    !gateLatest.data ||
    gateLatest.data.emailVerified !== true,
  "After the fix, the gate observer must reflect no-session — either via " +
    "error status or via data being cleared. This is what makes the " +
    "(app)/_layout.tsx Redirect to /(auth)/welcome fire.",
);

unsub();
console.log("\n✅ Fix verifies: qc.resetQueries() notifies the gate observer.");
