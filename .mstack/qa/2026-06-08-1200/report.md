# QA report — 2026-06-08 12:00

**Focus:** Business sign-up modal (Get Listed Early), View Launch Offer regression, consumer waitlist form
**Env:** localhost:5000
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run
1. Marketing page loads — ✓ pass
2. Get Listed Early modal — opens, fields present — ✓ pass
3. Get Listed Early modal — radio pill selection — ✓ pass
4. Get Listed Early modal — form submission happy path (mocked API) — ✓ pass
5. Get Listed Early modal — error state (mocked API 500) — ✓ pass
6. Get Listed Early modal — Cancel button dismisses modal — ✓ pass
7. View Launch Offer modal — regression check — ✓ pass
8. Consumer waitlist form — hero present — ✓ pass

## Issues

(none)

## Notes

Initial spec run had 6 selector failures — all were spec bugs, not app bugs:
- `getByLabel("Phone")` was ambiguous (matched tel input + radio); fixed to `getByRole("radio", { name: "Phone" })` / `getByRole("textbox", …)`
- `dialog.getByLabel("WhatsApp").click()` timed out because sr-only radio inputs sit behind label pills; fixed to `dialog.locator("label").filter({ hasText: /^WhatsApp$/ }).click()`
- `getByText("Membership")` matched 4 elements in the plans grid; fixed to `.first()` + `{ exact: true }`
- Footer has no email input (WaitlistCard is hero-only); updated S8 to only assert hero input

## Summary
8 total · 0 critical · 0 high · 0 medium · 0 low
