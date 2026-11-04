# Architecture decision log

Record deviations from this starter as numbered ADR entries including context, alternatives, decision, effect, date, and owner.

## ADR-0001 — Single Next.js application
**Decision:** TypeScript Next.js App Router handles the server-rendered public UI, admin UI, and backend endpoints. A separate Express/Fastify process is not required. **Reason:** one-origin deployment on port 8080, SSR SEO, simple local operation, typed code sharing. **Tradeoff:** backend is in-process and must be carefully isolated behind server-only modules.

## ADR-0002 — SQLite with Drizzle
**Decision:** SQLite plus Drizzle ORM and versioned SQL migrations, with WAL, foreign keys, busy timeout, and a single local writable DB file ignored by Git. **Reason:** user constraint and low operational overhead. **Tradeoff:** single-node persistent storage; production scale-out would need an explicit storage change.

## ADR-0003 — Published snapshots
**Decision:** drafts and published revisions are separate. Public traffic reads only published revisions. Publish is a transaction that updates navigation links and sitemap visibility. **Reason:** no accidental leakage of unfinished edits.

## ADR-0004 — Safe design-token editor
**Decision:** maintainer can edit colors, typography presets, spacing, radius, button styles, hero variants and per-card variants through validated JSON design tokens. Raw arbitrary CSS/JS is excluded. **Reason:** satisfies editable style requirements without XSS or layout instability.

## ADR-0005 — Card link model
**Decision:** new card defaults to navigation-enabled. Published cards get a canonical URL `/topics/<slug>` (or a validated in-page anchor if explicitly configured); the navigation row references the card ID, so slug changes automatically update links. **Reason:** predictable navigability and SEO.

## ADR-0006 — Reference fidelity
**Decision:** preserve the reference's content hierarchy and interaction patterns but use original branding and authorized copy/media. **Reason:** avoid reproducing protected content or falsely representing credentials/testimonials.

## ADR-0007 — MVP implementation contracts (2026-11-04, coordinator)
The executable v1 contracts live in `src/shared/content.ts`; the kit JSON remains the conceptual registry. Rich text is restricted to escaped plain text rather than arbitrary HTML. Sections use heading/body plus validated scalar `data` for type-specific labels; cards are reusable by section ID. All public reads are dynamic published snapshots. CSS Modules/plain scoped styles and server-generated validated CSS variables implement the visual system.

Administrative JSON mutations require an exact trusted Origin plus `X-Requested-With: CMS` (a non-simple header); cross-origin preflight is not enabled. Login uses trusted Origin checks. Single-origin requests avoid a separate token transport while rejecting cross-site form writes. Credentials are bootstrapped by local CLI using private environment variables, without an open registration endpoint.

Next.js 16.2.9, React 19.2.4, Drizzle 0.45.1, better-sqlite3 13.0.3, Zod 4.3.6, TypeScript 5.9.3, Vitest 4.0.18 and Playwright 1.58.2 are pinned. The Node proxy intercepts stored aliases and returns HTTP 301; Next's built-in permanent redirect would return 308. Local runtime data and uploads remain ignored. SQLite is a single-node persistence design.

## ADR-0008 — Acceptance hardening (2026-11-04, coordinator)
Independent review reproduced homepage rename and stale section-anchor defects. Homepage identity is now immutable and cannot be unpublished/archived. Publishing a homepage change that would orphan a published anchored card is rejected; navigation also filters stale anchor targets. Reusable cards expose a bounded display order with published-snapshot isolation. Theme text/button contrast requires at least 4.5:1 against relevant surfaces. Approved public destinations reject control characters and backslashes as well as script/data schemes. Manual redirects apply across public paths while excluding private/API/static routes.

Prettier is pinned as a development tool so the delivered TypeScript/TSX/CSS stays readable. GitHub Actions describes the same local verification commands and uses one production server on 8080; workflow execution on GitHub is not claimed as local evidence.

## ADR-0009 — Reproducible native dependencies and publication dates (2026-11-04)
The tested npm 12 install policy disables unnecessary Sharp/SQLite lifecycle rebuild hooks and uses their packaged native artifacts; runtime SQLite queries and Sharp processing are tested after clean installation. In this managed workspace the default npm, browser and build caches are read-only, so verification uses writable `/tmp` paths. Normal local users may use their default writable caches. Browser tests may select an executable through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Migration `0002.sql` stores actual publication events; a transactional migration journal runs numbered SQL once. Publishing records a timestamp in the content transaction; draft saves do not change it. Sitemap uses those timestamps, and honestly omits unknown dates for legacy published records until they are republished.

Proxy headers are ignored by default for rate limits. `TRUST_PROXY=true` is permitted only when a trusted reverse proxy strips/overwrites incoming forwarding headers; otherwise a shared standalone limiter is used. Contact attempts are capped at 20/hour, login attempts at 10 per window and account. Public form errors use Russian messages.

## ADR-0010 — Security patch gate and runtime media serving (2026-11-04)
Independent runtime dependency audit blocked acceptance on known advisories. Updated exact versions to Next/ESLint config 16.4.5, Drizzle 0.45.4, Sharp 0.35.5 and Zod 4.6.7; full verification is required again after this change. Earlier version records describe the initial scaffold, not the delivered runtime.

A production probe also showed that Next's startup public-file inventory did not serve newly uploaded files immediately. Uploads therefore use a controlled dynamic route with generated basename validation and database ownership lookup, backed by ignored runtime storage. Production E2E must verify the returned upload URL returns the raster content immediately, without a restart.

## ADR-0011 — Publication requirements and legal dependencies (2026-11-04)
Draft content can be incomplete. Publishing visible blocks validates headings and required bodies/actions. Canonical `/privacy` is the normalized v1 contact-policy reference; public forms require it, and dependent policy removal/rename is blocked until forms are hidden and published. This prevents empty H1 output and broken consent links. Shared settings require a nonblank policy version. Global SEO noindex and image/description defaults now participate in metadata and sitemap generation.

Vitest was updated to 4.1.12 after the development dependency audit. ESLint 9.39.5 is retained for compatibility with the Next configuration's import/react/accessibility plugin peer ranges; ESLint 10 was tested but produced unsupported peer warnings. Runtime dependency audit is the production acceptance gate; no unsupported dependency downgrade is applied automatically.
