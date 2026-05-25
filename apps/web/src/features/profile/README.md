# features/profile

Self-contained user profile feature. Composes:

- `lib/auth` — `requireUser()`, `auth.api.updateUser/changePassword/changeEmail`
- `lib/db` — `user` table updates + `audit()` for state changes
- `lib/storage` — only via `features/avatar` (this module doesn't touch storage directly)
- `lib/ui` — state primitives (used in sections that fetch data)

## Sections

1. **Account** — display name + email change (re-verifies via current email).
2. **Security** — change password; revokes other sessions on success.
3. **Notifications** — placeholder; wires up in `features/notifications` (W7).
4. **Danger zone** — anonymize-in-place delete.

## To remove this feature

```bash
rm -rf src/features/profile
rm -rf 'src/app/(app)/profile'
# Drop the /profile nav link in src/app/(app)/layout.tsx
```

No env vars, no migrations, no deps added by this feature.
