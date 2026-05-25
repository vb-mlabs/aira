# .mstack/

Workspace storage for the **mstack** Claude Code skill suite (`mlabs-plan`,
`mlabs-review`, `mlabs-code`, `mlabs-qa`, `mlabs-mockup`, `mlabs-ux-audit`,
`mlabs-debug`, `mlabs-research`, `mlabs-auto`).

Everything in here is **committed to git** so reviews, plans, and learnings
show up in PRs and travel with the repo across cloud workspaces.

## Layout

```
.mstack/
├── learnings.jsonl              # append-only, all skills write here
├── plans/                       # /mlabs-plan output
│   └── YYYY-MM-DD-<slug>.md
├── reviews/                     # /mlabs-review output
│   └── YYYY-MM-DD-<slug>.md
├── code/                        # /mlabs-code output
│   └── YYYY-MM-DD-<slug>/
│       ├── tasks.md
│       └── report.md
├── qa/                          # /mlabs-qa output
│   └── YYYY-MM-DD-HHMM/
│       ├── report.md
│       └── assets/
├── debug/                       # /mlabs-debug output (RCA → hand to /mlabs-code)
│   └── YYYY-MM-DD-<slug>/
│       ├── report.md
│       ├── assets/
│       └── specs/
├── research/                    # /mlabs-research output (→ feeds /mlabs-plan)
│   └── YYYY-MM-DD-<slug>.md
├── mockups/                     # /mlabs-mockup output
│   └── <feature>/
│       ├── v1/ … vN/
│       └── FEEDBACK.md
└── ux-audits/                   # /mlabs-ux-audit output
    └── YYYY-MM-DD-<slug>.md
```

## Workflow

```
/mlabs-research ─→ plans/ ─→ reviews/ ─→ [mockups/] ─→ code/ ─→ qa/   (greenfield)
                                          ↑
                                          only when review's
                                          UI-Significant: yes

                   /mlabs-debug ──────────────────→ code/             (bug fix, RCA-first)
                   /mlabs-qa  ──(escalate paused)─→ /mlabs-debug      (discovery → RCA)
                   /mlabs-ux-audit ──────────(post-ship visual + UX polish)
```

`/mlabs-auto` chains the main path including the optional mockup gate.
`/mlabs-research`, `/mlabs-debug`, and `/mlabs-ux-audit` are user-triggered
by design — auto never spawns them.

## Golden rule

**Only `/mlabs-code` edits source code.** Every other skill writes artifacts to
`.mstack/` and hands off via the chain above.

## Learnings

`learnings.jsonl` is the cross-skill memory. Skills append surprises here:
constraints discovered, gotchas hit, decisions worth remembering. Review
periodically and promote generic ones up to the mlabs-template repo.
