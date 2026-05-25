<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mstack -->
# mstack — the MLabs skill suite

This repo ships with **mstack**, a vendored Claude Code skill suite tailored to the MLabs MVP workflow. Skills live at `.claude/skills/mlabs-*` and produce artifacts under `.mstack/`. Both directories are intentionally tracked in git so reviews, plans, and learnings travel with the repo across cloud workspaces and forks. **Do not gitignore `.claude/` or `.mstack/`.**

## The workflow

```
/mlabs-research ──→ .mstack/research/<slug>.md      (optional, before /mlabs-plan)
       │
       ▼
/mlabs-plan ──────→ .mstack/plans/<slug>.md
       │
       ▼
/mlabs-review ────→ .mstack/reviews/<slug>.md       (approved + implementation plan
       │                                             + UI-Significant: yes|no flag)
       │
       │ if review's UI-Significant: yes
       ▼
/mlabs-mockup ────→ .mstack/mockups/<feature>/      (optional design exploration)
       │            (winner referenced in FEEDBACK.md)
       │
       ▼
/mlabs-code ──────→ .mstack/code/<slug>/            (code + commits + report)
       │
       ▼
/mlabs-qa ────────→ .mstack/qa/<run>/               (scenario-driven test report)
       │
       │ (escalate paused / un-RCA'd issues)
       ▼
/mlabs-debug ─────→ .mstack/debug/<slug>/  ──→ /mlabs-code  (bug fix, RCA-first)

/mlabs-ux-audit ──→ .mstack/ux-audits/<run>/        (post-ship visual + UX polish)
```

**Only `/mlabs-code` edits source code.** Every other skill writes artifacts to `.mstack/` and hands off via the chain.

`/mlabs-auto` chains plan → review → (mockup if UI-significant) → code with confirmation gates. `/mlabs-research`, `/mlabs-debug`, and `/mlabs-ux-audit` are user-triggered by design.

## When to use which skill

| Skill | Use when | Edits code? |
|---|---|---|
| `/mlabs-research` | Tech choice / stack research with sources + second opinion | No |
| `/mlabs-plan` | Designing a new feature; producing a plan doc | No |
| `/mlabs-review` | Reviewing a plan + producing the task list `/mlabs-code` will execute | No |
| `/mlabs-code` | Executing an approved review autonomously | **Yes (primary)** |
| `/mlabs-debug` | A specific bug is reported → reproduce → RCA → fix proposal | No (hands to `/mlabs-code`) |
| `/mlabs-qa` | Scenario-driven QA testing → report → approve → fix | Only post-approval |
| `/mlabs-mockup` | Generating UI design variants — standalone, or in-chain via `--from-review` when review is UI-significant | No (HTML in `.mstack/mockups/`) |
| `/mlabs-ux-audit` | Post-ship UX audit (visual + copy + flow + a11y) → report → approve → fix | Only post-approval |
| `/mlabs-auto` | Chaining plan → review → (optional mockup) → code in one pass | Delegates |

## Hard rules

- **`/mlabs-code` is the only skill that edits code as its primary purpose.** `/mlabs-qa` and `/mlabs-ux-audit` edit code only after an explicit user approval gate on a written report.
- **Plan → review → code is a strict pipeline.** `/mlabs-review` requires a plan doc; `/mlabs-code` requires an `approved` review.
- **One commit per task** in `/mlabs-code`. Never `--no-verify`. Never amend across tasks.
- **Pause on ambiguity.** Destructive migrations, edits to `src/config/brand.ts` / `src/config/design.ts` (rebrand layer), new top-level deps, CI config changes, env var rename/remove → always pause and ask.
- **Append surprises to `.mstack/learnings.jsonl`** via `.claude/skills/mlabs-shared/bin/append-learning.sh` so they compound across MVPs.

See each skill's `SKILL.md` for the full contract.
<!-- END:mstack -->
