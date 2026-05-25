# Claude Code persistent memory

Cross-session facts the assistant has learned about this project, the user, or
external resources. Each `.md` file is one memory; `MEMORY.md` (created on
first write) is the index.

## Why this lives in the repo

Claude Code's default memory directory is at
`~/.claude/projects/-home-runner-workspace/memory/` — that path is *outside*
the repo and may be wiped when Replit restarts the workspace. The setup script
at `.claude/scripts/setup-memory.sh` symlinks the default location to this
directory, so memories physically live inside the repo and survive restarts.

## Bootstrap

Run once per Replit session before Claude writes any memory:

```bash
bash .claude/scripts/setup-memory.sh
```

The script is idempotent and migrates any pre-existing memories at the default
location into this directory before linking.
