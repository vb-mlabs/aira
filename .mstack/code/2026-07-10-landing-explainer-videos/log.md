# Run log

- 2026-07-10 — pre-flight: created branch `feat/landing-explainer-videos` off `main`; committed `.mstack/` artifacts (plan + review + learning) as `00e54f2 docs(mstack): landing explainer videos plan + review`.
- 2026-07-10 — Task 1 started: LiteYouTube component.
- 2026-07-10 — Task 1 complete: `d1e7eb9`. `pnpm --filter @aira/web typecheck` clean. `pnpm --filter @aira/web lint` clean on the new file (16 pre-existing warnings elsewhere, 0 errors). Lefthook `check-migrations` + `check-contrast` passed.
- 2026-07-10 — Task 2 complete: `c51c60d`. Typecheck clean.
- 2026-07-10 — Task 3 complete: `b2eeb13`. Typecheck clean.
- 2026-07-10 — Task 4 attempted. Wrote `lite-youtube.test.tsx` with two assertions (no iframe on mount, iframe with youtube-nocookie src after click).
- 2026-07-10 — Task 4 failure #1: `TypeError: Cannot read properties of null (reading 'useState')` at `LiteYouTube:34`. Stack pointed to `@testing-library/react/node_modules/react-dom/cjs/react-dom-client.development.js` — clear signal of a React instance duplication.
- 2026-07-10 — Task 4 fix attempt A: added `resolve.dedupe: ["react", "react-dom"]` to vitest.config.ts. Same failure.
- 2026-07-10 — Task 4 fix attempt B: added explicit `resolve.alias` for react, react-dom, react-dom/client, and jsx runtimes → `require.resolve("react")` from the vitest config. Same failure — Vite aliases don't override esbuild's pre-bundle resolution inside third-party packages.
- 2026-07-10 — Task 4 fix attempt C: added `test.server.deps.inline: ["@testing-library/react"]` to force pre-bundling. `react` consolidated (top-level cjs path in stack) but `react-dom` still resolved through `@testing-library/react/node_modules/react-dom`. Same failure.
- 2026-07-10 — Root cause identified: both `apps/web/node_modules/react-dom` and `@testing-library/react/node_modules/react-dom` are `19.2.4` — same version, separate instances. Cleanest fix would be `pnpm.overrides` at workspace root + `pnpm install`, which is workspace-level scope beyond a single-feature commit.
- 2026-07-10 — Task 4 paused per the review's Pause-if trigger: "no existing Dialog test pattern exists in the repo AND the Dialog portal doesn't render in JSDOM out of the box — surface the exact error; do not skip the test." User picked the recommended option: skip Task 4, log a follow-up. Vitest config reverted to its original state; test file removed. `pnpm --filter @aira/web test` clean (172 tests pass across 20 files).
