# Memory index

- [Replit + GitHub push auth](replit-gh-push-auth.md) — `gh auth setup-git` makes `gh`'s token beat Replit's askpass; pin the helper in repo-local `.git/config` because Replit rewrites its managed config mid-session.
- [Replit truncated git history](replit-truncated-history.md) — workspace `.git` can end up with parents missing but no `.git/shallow`; first push to a fresh GitHub repo fails with `did not receive expected object <sha>`. Must rewrite history with `git replace --graft` + filter-branch.
