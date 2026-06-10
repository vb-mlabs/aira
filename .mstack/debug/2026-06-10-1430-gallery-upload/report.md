# Debug — Gallery image upload always returns "Upload failed."

**Started:** 2026-06-10 14:30
**Source:** user-report
**Env:** localhost:5000
**Status:** ready-for-code
**Investigator:** /mlabs-debug

## Symptom

Dropping or selecting an image in the Gallery section of `/admin/businesses/[id]`
shows "Uploading…" briefly, then either shows "Upload failed." inline or the
spinner disappears with no image added. The server returns 500.

## Repro

1. Log in as admin, navigate to `/admin/businesses/[any-id]`
2. In the Gallery section, drop or click to select any JPEG/PNG/WebP image
3. Observe: spinner appears, then "Upload failed." appears inline

**Expected:** Image is resized and stored; thumbnail appears in the gallery grid.
**Actual:** 500 response body `{"error":{"code":"images.server_error","message":"Upload failed. Try again."}}`.

## Investigation

### Data flow

```
GallerySection (client) → POST /api/v1/admin/businesses/[id]/images
  → processAndStoreBusinessImage()
    → storage.upload()
      → getStorageDriver().upload()
        → getClient()                    ← THROWS HERE
          if (!env.REPLIT_OBJECT_STORAGE_BUCKET_ID) throw Error(...)
```

- `apps/web/src/lib/storage/drivers/replit.ts:18-23` — `getClient()` guard throws
  `"REPLIT_OBJECT_STORAGE_BUCKET_ID is required for the replit storage driver"`
  when `env.REPLIT_OBJECT_STORAGE_BUCKET_ID` is falsy (undefined/empty string).
- `REPLIT_OBJECT_STORAGE_BUCKET_ID` is **not** a static env var that belongs in
  `.env.local` — it is injected by the Replit runtime. In dev shell it evaluates
  to empty string/undefined.
- The guard prevents the code from ever reaching `new Client(...)`. If it did,
  the SDK would call `getDefaultBucketId()` which fetches from the Replit sidecar
  at `http://127.0.0.1:1106/object-storage/default-bucket`.
- **Sidecar is running and works**: `curl http://127.0.0.1:1106/object-storage/default-bucket`
  returns `{"bucketId":"replit-objstore-7ec03186-b4ed-4cae-b991-c9abd53c4c54"}`.
- The `.replit` file already has `[objectStorage] defaultBucketID = "replit-objstore-..."`.
- The route catches the plain `Error` as the generic branch
  (`apps/web/src/app/api/v1/admin/businesses/[id]/images/route.ts:66-73`) and
  returns 500 `images.server_error`.

### SDK behaviour (verified from source)

`@replit/object-storage` `Client` constructor:
```ts
constructor(options) {
  this.state = {
    promise: this.init(options?.bucketId)  // undefined → calls getDefaultBucketId()
  }
}
async init(bucketId) {
  const bucket = gcsClient.bucket(bucketId ?? await getDefaultBucketId())
  // getDefaultBucketId() → fetch("http://127.0.0.1:1106/object-storage/default-bucket")
}
```
When `bucketId` is `undefined`, the SDK auto-detects via the sidecar. The sidecar
IS running. The guard in our driver short-circuits this and is therefore wrong.

## Root cause

`apps/web/src/lib/storage/drivers/replit.ts` has an explicit guard that throws when
`REPLIT_OBJECT_STORAGE_BUCKET_ID` is absent from the app's validated env. The
Replit runtime injects this value into the process automatically (not via `.env.local`),
so it is absent in the validated env object. The guard blocks the `Client` constructor
which would otherwise fall through to the sidecar's auto-detection — which works.

**Failing test:** `specs/repro.test.ts` — confirms the guard throws when `bucketId`
is `undefined` (the bug), and confirms the no-guard path resolves without throwing.

## Fix plan (for /mlabs-code)

**Files to change:**
- `apps/web/src/lib/storage/drivers/replit.ts` — remove the guard block (lines 19-23):
  ```ts
  // DELETE these 5 lines:
  if (!env.REPLIT_OBJECT_STORAGE_BUCKET_ID) {
    throw new Error(
      "REPLIT_OBJECT_STORAGE_BUCKET_ID is required for the replit storage driver",
    )
  }
  ```
  Keep `_client = new Client({ bucketId: env.REPLIT_OBJECT_STORAGE_BUCKET_ID })`.
  When `env.REPLIT_OBJECT_STORAGE_BUCKET_ID` is `undefined`, `options?.bucketId`
  is `undefined`, and the SDK auto-detects from the sidecar. When it IS set
  (e.g. in CI or a non-Replit deploy), the explicit value is used as before.

**Why it fixes the cause:** Removing the guard lets the SDK `Client` constructor
run. The sidecar returns the bucket ID, and uploads proceed.

**Hard-rule reminders:**
- `import "server-only"` is already present in `replit.ts` — keep it.
- No new env vars, no schema changes, no migrations.

**Acceptance:**
1. `npx tsx .mstack/debug/2026-06-10-1430-gallery-upload/specs/repro.test.ts` passes (already does).
2. Dropping a JPEG on the Gallery section of any admin business page uploads successfully and the thumbnail appears.

**Out of scope:**
- The `REPLIT_OBJECT_STORAGE_BUCKET_ID` env.ts declaration is `z.string().optional()`.
  After this fix it is no longer used to gate the driver, so its presence/absence in
  the env schema is irrelevant — leave it as-is.
- Evidence pipeline (`evidence-pipeline.ts`) uses the same `storage` singleton — it
  will also benefit from this fix transparently.

## External references

- Replit Object Storage sidecar: verified live at `http://127.0.0.1:1106/object-storage/default-bucket` — 2026-06-10 — returns `{"bucketId":"replit-objstore-7ec03186-b4ed-4cae-b991-c9abd53c4c54"}`
- `@replit/object-storage` dist source — 2026-06-10 — `Client.init()` calls `getDefaultBucketId()` when `bucketId` arg is `undefined`
