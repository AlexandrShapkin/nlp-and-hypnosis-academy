# Russian-friendly CMS implementation

Branch: `feat/russian-friendly-cms`. Base: `feat/cms-media-branding-usability`
(PR #1, still open). No merge, deployment, runtime data reset or paid provider setup.

## Implemented

- Russian login, ten task-oriented navigation destinations, dashboard shortcuts,
  statuses, notifications, empty states, validation and accessibility labels.
  Shared `messages.ts` maintains Russian names/date formatting; server messages
  preserve structured field paths without exposing database errors.
- Visual section cards in public order, localized templates, thumbnails,
  copy/move/show/hide/delete controls, contextual CTA/contact/gallery fields.
- Visual safe text editing: paragraphs/headings/bold/italic/lists/links, validated
  document storage and escaped legacy plain-text compatibility. No SQL migration.
- Exact ordered multi-photo selection, image replacement/removal, visual library,
  multiple-file upload, metadata editing and reference-aware deletion errors.
- Separate header/footer logos and favicon with visual selection/background previews.
- Service/card authoring without technical IDs, automatic addresses, section-name
  selection, basic SEO, automatic published navigation and permanent slug redirects.
- Russian visual theme controls, draft preview, explicit publication/history restore.
- Clear saved/unsaved/published status, inline errors, unsaved navigation/exit/logout
  warnings. Saved authenticated preview uses actual public rendering and noindex.
- Settings/menu saves explicitly state that they apply immediately, preserving
  their existing versioned contracts; pages/cards/themes retain draft publication.

## Verification

- `npm ci --cache /tmp/nlp-npm-cache --no-audit --no-fund`: PASS.
- `npm run db:migrate`, `npm run db:seed`: PASS on dedicated temporary databases;
  regression tests also verify seed idempotence and edited-content preservation.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: PASS.
- `npm test`: 51 tests across 7 files PASS.
- `npm run test:worker`: 6 Python safety tests PASS, including real Bubblewrap
  filesystem/network isolation and actual gateway denial sockets.
- `npm run build`: PASS; production Next.js server verified at localhost:8080.
- Browser journeys: 14/14 PASS (36.1 seconds), including the preview regression.
  Independent acceptance: PASS, no unresolved critical findings; see acceptance-latest.md.
- `npm audit --omit=dev`: zero runtime vulnerabilities.

The initial browser run revealed ambiguous test selectors and implicit select
label associations. Explicit labels and scoped notification selectors fixed them.
Independent review found a custom-page preview/body-edit mismatch. The fix keeps
body editing and public composition aligned when no hero is visible, including
hidden heroes; previews now use the full viewport and a single main landmark.
Retention labels and dates are also localized. The expanded suite also reached the existing login rate limit; test sessions now
reuse one authenticated state within their isolated run. Production rate limits
remain unchanged.

## OpenCode delegation

Implemented `scripts/opencode-free-task.sh` and its Python helpers. Only the
user-approved preferred `opencode/glm-5.3-flash-free` and fallback
`opencode/deepseek-v4.1-flash-free` are accepted. Catalog presence alone is not
claimed as successful free inference.

OpenCode 2.2.5 CLI, catalog and noninteractive syntax were verified. Preferred
execution failed, and fallback explicitly returned `Free usage limit reached`.
No external code patch was integrated; all implementation remained with Codex.
No paid model/provider was used and no financial-savings claim is made.

The final sandbox's `--check-only` catalog request succeeded. It copies explicit
public source files only, rejects sensitive paths/symlinks/potential credentials,
clears credentials/configuration/environment, hides the original checkout/home,
uses a private network namespace and public-provider-only HTTPS gateway, keeps
Git metadata read-only, and returns only a scoped patch for manual review. Tests
reject disallowed patches, paid models, private context and host/LAN/metadata
network destinations. Missing dependencies or model errors fail closed.

## Screenshots

- [Dashboard](screenshots/cms-dashboard-desktop.png)
- [Mobile page editor](screenshots/cms-page-editor-mobile.png)
- [Branding](screenshots/cms-branding.png)
- [Media library](screenshots/cms-media-library.png)
- [Mobile saved changes](screenshots/cms-mobile-edit-saved.png)
- [Theme preview](screenshots/cms-theme.png)

## Local commands

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:worker
npm run test:cms
```

`test:cms` creates a temporary database, uploads directory and random test account,
then runs migrations, seed, bootstrap, production build and Playwright on port
8080. It cleans up its own runtime files. Stop any existing local server first.
To rerun browsers after a current build:
`node scripts/test-cms-isolated.mjs --skip-build`.

Normal local app: `npm run dev` or, after `npm run build`, `npm run start`.
Do not run destructive test journeys against the normal database.

## Limits

- Free external inference could not be completed because no usable free quota was
  available; model execution and external patch integration are explicitly unverified.
- Section ordering uses accessible up/down controls rather than drag-and-drop.
- Unsaved history traversal protection uses the Navigation API where supported,
  with a history fallback; native document-exit prompts use browser-localized text.
- The pre-existing generated `next-env.d.ts` working change present before this task
  is preserved separately and excluded from the feature commit.

Changed-file inventory: [implementation-files.txt](implementation-files.txt).
Detailed final acceptance and any remaining limitations:
[acceptance-latest.md](acceptance-latest.md).
