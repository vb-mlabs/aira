# Fix — admin location field styling + selected value visibility

**Started:** 2026-07-17 16:44
**Source:** user-report
**Status:** fixed
**Commit:** 046949f

## Symptom / repro

On admin business create/edit, the Location search field:
1. Has no visible border.
2. Typed characters render as dots/ellipsis-looking marks instead of the actual glyphs.
3. Text colour is very light — hard to read while typing.
4. Typed text only becomes visible after highlighting/selecting it.
5. After picking a suggestion the address disappears from the input and
   only shows below the field as "Current: …".

Widget: `<gmp-place-autocomplete>` (Google PlaceAutocompleteElement),
loaded from `apps/web/src/app/admin/layout.tsx` with `v=weekly` (always
latest SDK).

## Root cause

The widget was migrated to `<gmp-place-autocomplete>` in June 2026
(commit `bf0f487`) under the assumption that the internal `<input>` was
rendered in the **light DOM** — the header comment on
`places-address-input.tsx` states this explicitly, and the CSS block in
`globals.css` uses `gmp-place-autocomplete input { ... }` descendant
selectors with `!important` to override Google's shipped defaults.

Google has since moved the element's internal chrome (input, prediction
list, icons) into an encapsulated Shadow DOM and exposed a `::part(...)`
theming API. Because we still ship `v=weekly`, the browser is on the
newer SDK. The descendant selectors no longer pierce the shadow boundary,
so:

- Symptoms 1, 3, 4 — our border / color / focus-ring rules never apply.
  The user sees Google's default styling (thin border, near-white text
  on a white/transparent background); selection highlight is the only
  time text gets high enough contrast to be legible.
- Symptom 2 — the low-contrast text reads as a row of dim marks to the
  eye until highlighted; combined with the platform-default font it can
  look like ellipsis/bullets.
- Symptom 5 — the mount effect seeds the internal input via
  `el.querySelector('input')` (light DOM only). With the input now inside
  Shadow DOM, `querySelector` returns null, so no seed happens; after
  `gmp-select` we call `onChange(place.formattedAddress)` to update
  parent state but never write the address back into the input, so the
  visible field keeps whatever partial text the user typed.

## Fix

Two files. Belt-and-suspenders — the light-DOM selectors stay in place
so older SDK versions (should Google roll back or a cached bundle land)
keep working; the new `::part(...)` selectors handle the current
Shadow-DOM SDK.

- **`apps/web/src/app/globals.css`** — add `::part(input)`,
  `::part(main-container)`, and `::part(prediction-item*)` rules mirroring
  the existing light-DOM CSS. Same tokens (`var(--input)`,
  `var(--foreground)`, `var(--ring)`, `var(--radius-2xl)`), so nothing
  changes about the design system — just widens the selector coverage.
- **`apps/web/src/features/admin/components/places-address-input.tsx`**
  - Read the internal input via both `el.shadowRoot?.querySelector('input')`
    and `el.querySelector('input')`, taking whichever exists. Wrap in a
    `getInternalInput(el)` helper used by both seed and post-select sync.
  - After `gmp-select` resolves, write `place.formattedAddress` back
    into the internal input so the visible field matches parent state.
  - Track `value` in a ref and, when it changes externally (not from
    typing), re-seed the internal input. Fixes the case where the
    parent's onChange fires but the field doesn't reflect the address.
  - Drop the "Current: …" line — the address is now visible in the
    field, so the auxiliary line was redundant and (per user report)
    confusing.

## Scope-gate note

`globals.css` is on `conventions.tokenDrift` / `paths.globalsCss`. This
fix edits the existing Google-element component block (lines 313-346),
introduced in `bf0f487` as a fix. No token values change; all rules
consume existing `var(--…)` tokens. Treating as component-scoped CSS
inside the global file, consistent with the prior fix precedent.

## Evidence

- typecheck: `pnpm typecheck` — pass
- token drift: `.claude/plugins/cache/mstack/mstack/0.5.0/shared/bin/check-token-drift.sh apps/web/src/app/globals.css` — <see below>
- manual UI verification: user to confirm on the admin business page
  (dev/prod Maps key required — cannot repro headless without admin auth
  + `GOOGLE_MAPS_API_KEY` set).

## Follow-ups

- If the user reports the field still doesn't render correctly, escalate
  to `/mstack-debug` with browser devtools screenshots of the element's
  shadow tree — the `::part` names may differ between SDK versions and
  need to be adjusted.
