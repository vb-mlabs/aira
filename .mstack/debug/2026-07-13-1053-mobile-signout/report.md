# Debug — Mobile sign-out doesn't redirect user off the (app) tabs

**Started:** 2026-07-13 10:53
**Source:** user-report
**Env:** mobile (Expo Go / EAS build) — hits Better Auth via `EXPO_PUBLIC_API_BASE_URL`
**Status:** ready-for-code
**Investigator:** /mlabs-debug

## Symptom

User taps **Sign out** on the Account tab → confirms in the dialog → dialog dismisses → **nothing else happens**. The tab bar stays visible, the Account screen is still there, name / email / avatar are still populated. The user is not sent back to `/(auth)/welcome`.

Reloading the app after this DOES land on `/(auth)/welcome` (because tokens have been wiped from `expo-secure-store` and the cold-start gate at `apps/mobile/app/index.tsx` re-runs `meRequest()` → 401 → redirect). But in-session, sign-out is visually a no-op.

## Repro

1. Sign in on the mobile app so `useMe()` is cached as `{ data: user, status: "success" }`.
2. Go to the Account tab.
3. Tap "Sign out" → confirm.

**Expected:** Dialog dismisses, app navigates to `/(auth)/welcome`.
**Actual:** Dialog dismisses, user remains on the Account tab. `expo-secure-store` no longer has `auth.access` / `auth.refresh` (checked via subsequent app-restart behavior).

**Artifact:** `specs/repro.test.mjs` — a pure Node test that reproduces the exact TanStack Query state transition using the same `@tanstack/react-query` v5.59 the app runs on. Fails today with the assertion below.

## Investigation

Traced the full sign-out flow end-to-end:

- `apps/mobile/app/(app)/account/index.tsx:238-243` — Sign-out dialog calls `signOut.mutateAsync()`.
- `apps/mobile/features/auth/hooks.ts:54-60` — `useSignOut()` returns a mutation whose `onSuccess` runs `qc.clear()`. The comment in `account/index.tsx:240-243` describes the intended chain: *"qc.clear() flips useMe() to undefined; the (app) gate at _layout.tsx then redirects to /(auth)/welcome."*
- `apps/mobile/features/auth/api.ts:149-165` — `signOutRequest()` fires `POST /api/auth/sign-out` best-effort and **always** clears tokens in a `finally` block.
- `apps/mobile/app/(app)/_layout.tsx:44-72` — The gate:
  ```
  if (me.isPending && !me.isFetched) return null;
  if (me.isError || !me.data?.emailVerified) return <Redirect href="/(auth)/welcome" />;
  ```

So the intended chain is: `qc.clear()` → `useMe` observer flips → gate re-renders → Redirect. **The break is in the first arrow.**

Empirical check (`specs/qc-clear-behavior.mjs`, run against `@tanstack/react-query@5.59.20`):

```
Before clear:  fetchCount=1  observer.data={"id":"u_1","emailVerified":true}  status=success
After clear:   fetchCount=1  observer.data={"id":"u_1","emailVerified":true}  status=success
                    ^— unchanged! observer never got notified.
```

## Root cause

In TanStack Query v5, `queryClient.clear()` calls `queryCache.clear()` → per-query `remove()` → `query.destroy()`. `destroy()` cancels in-flight retryers and clears the GC timeout but **does not dispatch a state change**, so subscribed `QueryObserver` instances (there is one per `useMe()` call site) never fire their listeners. React's `useSyncExternalStore` in `useBaseQuery` isn't notified, so **the component holding the gate — `apps/mobile/app/(app)/_layout.tsx` — never re-renders**. Its `useMe()` result stays frozen at `{ data: user, status: "success" }`. The Redirect condition (`me.isError || !me.data?.emailVerified`) evaluates to `false`, so no redirect.

`AccountScreen` DOES re-render (the mutation state changed) — but that only forces a re-fetch of `useMe` inside AccountScreen; it doesn't reach the parent layout that owns the gate. So the user sees no visible navigation change.

This is a specific TanStack Query v5 gotcha: **`queryClient.clear()` wipes cache entries but does NOT notify active observers.** It is only safe to use for logout when a separate mechanism (state flag, router.replace, or `resetQueries`) forces the auth gate to re-evaluate.

**Failing test:** `specs/repro.test.mjs` — subscribes a `QueryObserver` to `["auth", "me"]` after priming the cache, runs `qc.clear()`, asserts that the observer's post-clear result reports "no session". Today the observer still returns `emailVerified: true`, so the assertion trips with:

```
AssertionError: ROOT CAUSE: after sign-out, the (app) gate's useMe observer
still reports emailVerified=true, so the Redirect to /(auth)/welcome never
fires and the user stays inside (app).
```

**Fix verified:** `specs/fix-verifies.mjs` — same setup, but swap `qc.clear()` for `qc.resetQueries()`. Observer receives 3 notifications; `data` becomes `undefined`, `status` becomes `"error"` → gate's condition passes → Redirect would fire. Test passes.

## Fix plan (for /mlabs-code)

**Files to change:**

- `apps/mobile/features/auth/hooks.ts` — in `useSignOut()`, replace
  ```
  onSuccess: () => qc.clear(),
  ```
  with
  ```
  onSettled: () => qc.resetQueries(),
  ```
  Two changes rolled together:
  1. `clear()` → `resetQueries()` — this is the bug fix. `resetQueries()` dispatches a reset action on each query, which notifies observers → React re-renders the gate → Redirect fires.
  2. `onSuccess` → `onSettled` — belt-and-braces. `signOutRequest()`'s `finally` clears local tokens even if the `POST /api/auth/sign-out` fetch throws (offline, unreachable server, or a server 5xx). Without this change, a failed network call would skip the reset entirely and reproduce the same "stuck on tabs" symptom for a different reason.

**Why it fixes the cause:** `qc.resetQueries()` dispatches state changes on each query, which triggers `QueryObserver.onQueryUpdate()` → subscriber listeners fire → `useSyncExternalStore` triggers a React re-render on the `(app)/_layout.tsx` gate. On that re-render, the fresh queries have `data: undefined` (and their re-triggered fetches will 401), so the redirect condition passes.

**Hard-rule reminders:** None — this is a client-only change in the mobile app, no schema, no env, no service-layer boundary crossings.

**Acceptance:**

1. `node .mstack/debug/2026-07-13-1053-mobile-signout/specs/repro.test.mjs` — after the fix (with a matching update to swap `qc.clear()` for `qc.resetQueries()` in the test's inline simulation) — must pass. Currently fails with the root-cause assertion.
2. Manual repro on Expo Go: sign in → Account tab → Sign out → confirm → app navigates to `/(auth)/welcome` within one animation frame.

**Out of scope (spotted but not part of this fix — flag to the user):**

- `apps/mobile/features/profile/hooks.ts:35-40` — `useDeleteAccount()` uses the identical `onSuccess: () => qc.clear()` pattern and has the same bug. Fix should mirror this one.
- `apps/mobile/features/profile/api.ts:36-38` — `deleteAccount()` never calls `clearTokens()` locally after the DELETE. Post-delete, the user's tokens sit in SecureStore until the app is reinstalled. (Server-side the tokens are invalid, so it's not a security hole, but it's messy.)
- `apps/mobile/components/ui/Dialog.tsx:67-70` — `onPress` fires `onConfirm?.()` (unawaited) then `onClose()` immediately. Any async work in `onConfirm` (like the sign-out mutation) races with dialog dismiss. Not the cause of this bug, but worth noting.

## External references

- TanStack Query v5.59 source — `packages/query-core/src/queryCache.ts` `clear()` / `remove()` and `packages/query-core/src/query.ts` `destroy()`, verified against `node_modules/@tanstack/query-core` on 2026-07-13. `destroy()` does not dispatch a state change, so subscribers are never invoked.
