---
name: replit-truncated-history
description: A Replit workspace's `.git` can end up with truncated history (commits referencing parents the local repo doesn't have) WITHOUT a `.git/shallow` file. First push to a new GitHub repo fails with `remote: fatal: did not receive expected object <sha>` and no amount of repacking, --no-thin, or auth fixes helps.
metadata:
  type: feedback
---

If `git push` to a fresh GitHub repo fails with `remote: fatal: did not receive expected object <sha>` and `error: remote unpack failed: index-pack failed`, and you've ruled out auth (see [[replit-gh-push-auth]]) and pack corruption (`git fsck` clean, `verify-pack` ok), check whether the local history is **truncated mid-history but not marked shallow**.

**Why:** Replit's `gitsafe-backup` workflow (and possibly other state-restore paths) can leave the workspace `.git` with commits whose parents aren't present locally. There's **no `.git/shallow` file**, so git itself doesn't know the history is incomplete — but GitHub's receive-pack runs a connectivity check on push and demands the missing parent. The error reports the parent SHA, which is genuinely absent from local objects (`git cat-file -t <sha>` errors).

**How to diagnose:**

```bash
git rev-list --reverse main | head -1                     # the "earliest" local commit
git cat-file -p <that-commit>                              # check its "parent" line
git cat-file -t <parent-sha>                               # if errors → parent is missing
cat .git/shallow                                           # if missing → repo isn't officially shallow
```

**How to fix:** Shallow markers don't help — `.git/shallow` is only honored by `fetch`, not `push`. You must rewrite history to make the truncation point a real root commit. From a clean throwaway clone (so the workspace stays untouched until the new history is verified):

```bash
git clone --single-branch --branch main file:///path/to/workspace /tmp/clean
cd /tmp/clean
git replace --graft <earliest-commit-sha>                  # no parent args = make it a root
git filter-branch -f -- --all                              # materialise; rewrites all downstream SHAs
git replace -d <earliest-commit-sha>                       # cleanup
# pin gh credential helper here too (see replit-gh-push-auth)
git remote set-url origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

Then sync the workspace to the new history: `git stash --include-untracked`, `git fetch origin main`, `git reset --hard origin/main`, `git stash pop`. **Watch out:** `Bash(git reset --hard:*)` is in the project's settings.json `deny` list — user has to run reset themselves via `!` prefix.

All commit SHAs from the new root onward change. Working tree contents are identical. GPG signatures on the rewritten commits are stripped (warned about by `git replace --graft`).

**Symptom that locked it in for me:** binary-scanning the pack for the missing OID (`perl -e 'open F,...; print index($_,pack("H*",$sha))'`) found no occurrence — meaning the pack doesn't contain a REF_DELTA pointing to it. That ruled out delta-base issues entirely and pointed to the connectivity check as the only remaining explanation.