# Mockup feedback — Subscriptions + Sponsorships

## Decision

**v4 is the confirmed implementation target.**

## What v4 is

- v2's compact table layout (status pill / plan + meta / period / amount / actions columns; "+ Add" button in section header)
- Add subscription and Add sponsorship forms open as **modal dialogs** (`<dialog>`) rather than inline panels below the table
- Native `<dialog>` for accessibility (Escape closes, focus trapping, backdrop click closes)
- Input `:focus` ring uses `--primary` + `box-shadow` so fields are clearly visible (addresses prior "inputs not visible when unfocused" feedback)

## Variants reviewed

| Variant | Tag | Verdict |
|---------|-----|---------|
| v1 — Stacked cards | spacious | Not chosen — too tall for historical rows |
| v2 — Compact table | dense | Chosen as base; inline form changed to modal |
| v3 — Hybrid details/expand | progressive | Not chosen — extra click overhead |
| v4 — Compact table + modals | **selected** | ✅ Final target |

## Implementation notes for `/mlabs-code`

- Subscription table: Plan / Period / Status / Evidence / Recorded (hide-mobile) / Amount / Actions
- Sponsorship table: Category·Tier / Period / Status / Notes (hide-mobile) / Amount / Actions
- Add forms → shadcn `<Dialog>` component (maps to native `<dialog>` under the hood)
- Modal footer: Cancel (ghost) + primary action button
- Amount pre-fills from plan selection; end date auto-calculates from start + duration
- Evidence upload field: optional, with "No evidence" warning chip on existing rows
- Both modals should reset on close
