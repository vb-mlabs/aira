---
name: replit-gh-push-auth
description: On Replit, `git push` to a GitHub remote can fail (403 or pack-unpack errors) even when `gh auth status` shows the right user — run `gh auth setup-git` to make `gh`'s credential helper win over Replit's askpass.
metadata:
  type: feedback
---

When pushing from a Replit workspace to `github.com`, do not assume `gh auth login` alone is enough. Run **`gh auth setup-git`** once per repo (or globally) before the first push.

**Why:** Replit wires `replit-git-askpass` via `GIT_ASKPASS` and writes its own creds into `/run/replit/user/<uid>/.config/git/config`. That askpass injects the *workspace-level GitHub integration account*, which often differs from the account `gh` is logged into. Symptom: GitHub returns `Repository not found` on push to a private repo that `gh repo view` clearly sees — because git is authenticating as the *other* user. Credential helpers take precedence over askpass, so `gh auth git-credential` as the helper for `github.com` makes the `gh` token win.

**How to apply:**

1. **First-line fix (often enough):** `gh auth setup-git` registers the helper in Replit's managed git config file.
2. **Durable fix (needed if pushes start failing again mid-session):** Replit *periodically rewrites* `/run/replit/user/<uid>/.config/git/config` (on identity changes, session events, etc.), wiping the helper that `gh auth setup-git` installed. Pin the helper in the **repo-local** `.git/config` — Replit can't reach it there:
    ```bash
    git config --local credential.https://github.com.helper ""
    git config --local --add credential.https://github.com.helper '!/nix/store/.../bin/gh auth git-credential'
    ```
    The first empty-value line resets the helper chain so we don't inherit Replit's askpass. Get the gh binary path from `which gh` (it's a `/nix/store/.../bin/gh` symlink).
3. If `gh` lacks `delete_repo` scope and you need it: `gh auth refresh -h github.com -s delete_repo`.

Diagnostic: `printf 'protocol=https\nhost=github.com\n\n' | git credential fill` shows which username git will actually send. If it returns `username=token` (Replit's internal scheme) instead of your GitHub username, the helper isn't winning.

Related: [[replit-truncated-history]] is a separate Replit gotcha where the workspace ends up with history missing parent commits but no `.git/shallow` file — auth fix alone won't save you there.
