# Implementation log — F21 push broadcasts

**Started:** 2026-06-23

---

- 2026-06-23 — Pre-flight passed. Branch `feat/qa-test-accounts-seed`. Precursor commit prepared with F21 plan + review + EAS init code artifacts + `*.jks` ignore.

- 2026-06-23 — T12 committed (`8e03c8e`). MANDATORY PAUSE per F21 review: adding `expo-notifications` to `app.config.ts.plugins[]` is a native-code change. Existing TestFlight + Play Internal Testing builds will NOT receive push even with OS permission granted. A new EAS production build for both platforms is required before push works on real devices. Pipeline: `eas build --profile production --platform all` → `eas submit --profile production --platform all` (runbook at docs/operations/eas-build-runbook.md). Awaiting user acknowledgment to continue with T13–T17.

- 2026-06-23 — T13 `8523802`, T14 `6475213`, T15 `ab84958`, T16 `58d0b2e`, T17 `b71c631`. Run complete. 17/17 tasks done. Report at `.mstack/code/2026-06-23-f21-push-broadcasts/report.md`. Plan status flipped to `implemented`. Recommended next: `/mlabs-qa` against the admin broadcast flow + mobile profile notifications row; OR trigger the EAS production rebuild + submit so push activates on the existing TestFlight + Play Internal Testing tracks.
