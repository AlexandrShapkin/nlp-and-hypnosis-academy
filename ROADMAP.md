# Delivery roadmap

Owner: primary Codex coordinator. Update status, test evidence and reviewer outcome at each milestone. A milestone is not done merely because code has been written.

| Phase | Outcome | Primary owner | Exit gate | Status |
| --- | --- | --- | --- | --- |
| 0 | Baseline repo, decisions, contracts, test harness | Coordinator | Commands/docs and shared types agreed | Verified |
| 1 | Next.js TS, SQLite schema/migrations, auth bootstrap, seed, port 8080 | Coordinator + `content_backend` | Public health/home route and migrations work | Verified |
| 2 | Nine-section content-driven homepage and responsive visuals | `public_site` | Rendered from SQLite; keyboard/mobile checks | Verified |
| 3 | Maintainer CRUD, media, preview, drafts, publish and auto-navigation | `maintainer_admin` + `content_backend` | Create/edit/publish/unpublish flow proven | Verified |
| 4 | SEO, forms, redirects, legal settings, theme editor | All three (disjoint scopes) | SEO/lead/theme end-to-end checks pass | Verified |
| 5 | Integration, performance/security tests, docs | Coordinator | lint/typecheck/test/build/e2e pass | Verified |
| 6 | Independent reviewer acceptance and remediation | `acceptance_reviewer`, then owners for fixes | Reviewer PASS; P0/P1 = 0 | Verified — independent PASS |

## Phase dependencies

- Coordinator freezes schemas and API adapters before Phase 2/3 parallel edits.
- Public and admin workers must not edit the same route/layout files. Shared root layout, global dependency declarations and environment plumbing belong to coordinator.
- Backend publishes usable typed mocks/stubs early, then real implementations, so frontend/admin can develop without waiting for every endpoint.
- Reviewer is brought in only when integrated code is runnable; reviewer findings are routed back to the relevant owner and verified again.

## MVP scope

Public site, accessible responsive layout, all-content CMS, new-card navigation, first-party SEO, media, safe contact form with consent, editable design system, auth, audit, migration/seed, tests, local runbook.

## Deferred unless trivial

Multitenancy, multilingual authoring interface (public locale remains `ru-RU`), payment processing, direct calendar booking integration, arbitrary HTML/CSS editor, marketing automation, complex drag-and-drop page builder, external object storage, advanced analytics, CMS roles beyond owner/maintainer.

## Final review status

Reviewer verdict: **PASS** — independent read-only review, no unresolved P0/P1.
Evidence location after implementation: `reports/acceptance-latest.md`.


## Integrated verification — 2026-11-04

- Clean `npm ci --cache /tmp/nlp-npm-cache --no-audit --no-fund`: PASS.
- `npm run db:migrate` and repeated `npm run db:seed`: PASS; isolated clean DB tests exercise migration journal/idempotence.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: PASS.
- `npm test`: 37 tests / 5 files PASS.
- `npm run build`: PASS, Next.js 16.4.5.
- `npm run dev`: started on 8080; homepage200/admin307 verified, then stopped.
- `npm run start`: production server started on 8080; homepage/topic/sitemap200 and admin login redirect verified.
- `npm run test:e2e`: 5/5 PASS, including desktop/mobile, card publish/rename/unpublish, consent, theme rollback and immediate runtime image serving.
- `npm audit --omit=dev --json`: zero runtime vulnerabilities after patching.
- Three implementation agents handed off; independent reviewer reproduced lifecycle, validation, media and dependency blockers and owners supplied fixes/regression tests.
- No push, merge, deployment or production-data change performed. Working-tree changes remain uncommitted.

Independent final review confirmed returned upload URL200 and hero image/alt publication, guard regressions,37tests, runtime audit0, SEO/auth HTTP probes and cleanup of the random review account.

## Russian CMS redesign — current feature branch

- Branch: `feat/russian-friendly-cms`, based on existing media/branding work (PR #1).
- Three implementation workers delivered Russian task navigation, contextual section templates,
  safe rich text, visual ordered media, branding/settings/theme and stable menu destinations.
- No database migration required; legacy snapshots/plain text remain compatible.
- `npm ci`, format/lint/typecheck, 51 unit/integration tests and production compilation pass.
- Initial browser run exposed selector ambiguity and select label association; fixes integrated.
- Full isolated browser suite and independent acceptance: PASS. Earlier roadmap
  verification entries refer to the previous MVP baseline; final redesign evidence follows below.
- OpenCode catalog verified in secured sandbox; free execution quota unavailable. No paid models used.

### Final redesign verification and acceptance

- Final format/lint/typecheck, 51 unit/integration tests and production build: PASS.
- Final isolated Playwright: **14/14 PASS (36.1s)**, including custom-page hidden-hero preview parity.
- Worker security tests: **6/6 PASS**, real secured catalog probe PASS; free inference unavailable (quota).
- Independent reviewer: **PASS** after resolving one P1 preview/body-edit defect and two P2 preview-layout/retention-localization findings. Independent targeted regression 1/1 PASS and separate preview/public text comparison PASS.
- Runtime dependency audit: zero vulnerabilities. Existing local runtime/configuration fingerprints: 6/6 unchanged.
- Six CMS screenshots and complete implementation/changed-file reports are in `reports/`.
- Delivered: [PR #2](https://github.com/AlexandrShapkin/nlp-and-hypnosis-academy/pull/2),
  based on the existing media/branding branch (PR #1). No production deployment or merge.
