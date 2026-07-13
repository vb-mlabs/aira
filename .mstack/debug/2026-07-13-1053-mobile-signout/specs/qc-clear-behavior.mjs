// Verify what queryClient.clear() actually does to active observers
// in the same TanStack Query v5 the mobile app is on.

import {
  QueryClient,
  QueryObserver,
  MutationObserver,
} from "@tanstack/react-query";

const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
});

let meFetchCount = 0;
let currentUser = { id: "u_1", emailVerified: true };

async function meRequest() {
  meFetchCount += 1;
  // Simulate token-based auth: after "sign-out" (currentUser === null), reject.
  if (!currentUser) throw new Error("no session");
  return currentUser;
}

// Prime the cache like useMe would after a successful login.
await qc.fetchQuery({ queryKey: ["auth", "me"], queryFn: meRequest });

// Attach an observer just like useMe() in (app)/_layout.tsx does.
const observer = new QueryObserver(qc, {
  queryKey: ["auth", "me"],
  queryFn: meRequest,
  retry: false,
  staleTime: 60_000,
});

let latestObserverResult = observer.getCurrentResult();
const unsubscribe = observer.subscribe((r) => {
  latestObserverResult = r;
});

console.log("Before clear:");
console.log("  fetchCount =", meFetchCount);
console.log("  observer.data =", JSON.stringify(latestObserverResult.data));
console.log("  observer.status =", latestObserverResult.status);

// Simulate the signOut flow: server-side revoke would happen here, then:
currentUser = null; // tokens cleared, next fetch would 401
qc.clear();

// Give react-query a tick to notify subscribers (notifyManager is async).
await new Promise((r) => setTimeout(r, 50));

console.log("\nImmediately after qc.clear() (no re-render):");
console.log("  fetchCount =", meFetchCount);
console.log("  observer.data =", JSON.stringify(latestObserverResult.data));
console.log("  observer.status =", latestObserverResult.status);
console.log("  observer.getCurrentQuery() has state:", observer.getCurrentQuery().state.status);

// Simulate what happens on a component re-render: React calls
// observer.setOptions(...) again, which is what useBaseQuery does per render.
observer.setOptions({
  queryKey: ["auth", "me"],
  queryFn: meRequest,
  retry: false,
  staleTime: 60_000,
});

await new Promise((r) => setTimeout(r, 100));

console.log("\nAfter simulated re-render (observer.setOptions):");
console.log("  fetchCount =", meFetchCount);
console.log("  observer.data =", JSON.stringify(latestObserverResult.data));
console.log("  observer.status =", latestObserverResult.status);
console.log("  observer.error =", latestObserverResult.error?.message);

unsubscribe();
