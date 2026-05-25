# features/avatar

User avatar upload + display. Composes:

- `sharp` — server-side resize to 256×256 JPEG (consistent storage, no
  client-trusted dimensions).
- `lib/storage` — driver-agnostic; default writes through the Replit Object
  Storage driver and serves via `/api/storage/[...key]`.
- `lib/auth` — `requireUser()` gates the upload route.
- `lib/db` — updates `user.image` on success.

## Routes

- `POST /api/v1/avatar` (multipart, field `file`) — upload + replace.
- `DELETE /api/v1/avatar` — remove avatar.

## Limits

- MIME: `image/jpeg`, `image/png`, `image/webp`.
- Max body size: 5 MB. Enforced before sharp touches the bytes.
- Output: 256×256 JPEG, quality 85.

## To remove this feature

```bash
rm -rf src/features/avatar
rm -rf 'src/app/api/v1/avatar'
# In features/profile/components/account-section.tsx — remove the <AvatarUploader> line.
```

The `image` column on `user` is owned by Better Auth's standard schema, not by
this feature — leave it in place even when removing avatar.
