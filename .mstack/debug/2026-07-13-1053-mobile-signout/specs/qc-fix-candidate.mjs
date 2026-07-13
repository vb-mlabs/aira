// Test fix candidates. The (app) gate does NOT re-render just because a
// mutation in a child (AccountScreen) resolved — so onSuccess needs to
// notify the useMe observer directly, not just wipe the cache.

import { QueryClient, QueryObserver } from "@tanstack/react-query";

async function run(label, onSignOutSuccess) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });

  let currentUser = { id: "u_1", emailVerified: true };
  const meRequest = async () => {
    if (!currentUser) throw new Error("no session");
    return currentUser;
  };

  await qc.fetchQuery({ queryKey: ["auth", "me"], queryFn: meRequest });

  const observer = new QueryObserver(qc, {
    queryKey: ["auth", "me"],
    queryFn: meRequest,
    retry: false,
    staleTime: 60_000,
  });

  let notifyCount = 0;
  let latest = observer.getCurrentResult();
  const unsub = observer.subscribe((r) => {
    notifyCount += 1;
    latest = r;
  });

  currentUser = null;
  await onSignOutSuccess(qc);
  await new Promise((r) => setTimeout(r, 100));

  console.log(`[${label}]`);
  console.log("  notifyCount (subscriber fires) =", notifyCount);
  console.log("  latest.data =", JSON.stringify(latest.data));
  console.log("  latest.status =", latest.status);
  console.log("  latest.error =", latest.error?.message);
  console.log(
    "  → would (app) gate redirect?",
    latest.status === "error" || !latest.data?.emailVerified,
  );
  console.log("");

  unsub();
}

// Baseline (current buggy code)
await run("qc.clear()  [current]", (qc) => qc.clear());

// Fix candidates
await run("qc.resetQueries()", (qc) => qc.resetQueries());
await run("qc.removeQueries()", (qc) => qc.removeQueries());
await run("qc.invalidateQueries()", (qc) => qc.invalidateQueries());
await run("qc.setQueryData + clear", (qc) => {
  qc.setQueryData(["auth", "me"], null);
  qc.clear();
});
