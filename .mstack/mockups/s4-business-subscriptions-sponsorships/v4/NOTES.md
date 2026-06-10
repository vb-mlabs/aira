# v4 — Compact table + modal forms

## What makes this variant distinct

Identical table layout to v2 (status / period / amount / actions columns, section header "+ Add" button) — the only change is that the "Add subscription" and "Add sponsorship" forms now open as **native `<dialog>` modal overlays** instead of inline panels below the table. Backdrop click or the ✕ button closes the dialog; pressing Escape also closes it (built into `<dialog>`).

## Changes from v2

- The inline `add-form` panel at the bottom of each section card is **gone** — the section ends with the table, keeping cards compact regardless of state.
- "+ Add subscription" and "+ Add sponsorship" buttons call `dialog.showModal()`.
- Modal has three zones: header (title + business context + close ✕), body (form grid), footer (Cancel + primary action) — matching the shadcn `<Dialog>` structure we'll implement.
- Input fields have explicit `:focus` ring using `--primary` and a subtle `box-shadow` so they're clearly visible against the light card background.
- Amount field is pre-filled from the selected plan; a hint line explains it's overridable.
- End date carries a hint ("auto-filled from plan duration") so admins know they can leave it alone.

## Pros

- **Clean section cards** — no inline form peeking out at the bottom of the card regardless of whether the user last clicked "+ Add". v2's inline form was always visible in the mockup; in production it would toggle, but modals avoid the layout-shift problem entirely.
- **Focused entry** — backdrop blur de-emphasises the rest of the page; admin can't accidentally hit another section's Save while the form is open.
- **Consistent with every other admin modal** in the app (categories, gallery, etc.) — one mental model.
- Native `<dialog>` — accessible, Escape key closes, focus trapped automatically by browsers, no JS state management.
- Input focus rings are visible (fixed the "inputs not visible when unfocused" feedback from the previous sprint).

## Cons

- One extra click to open; if the admin opens, fills in, cancels, and re-opens, the form resets (mitigated by keeping the modal lightweight — few fields).
- Can't compare the subscription being added against the existing table rows while the modal is open (modal covers the table). v2's inline form kept the table visible above.

## Decision

**This is the confirmed winner.** v2's scan table + v4's modal forms.
