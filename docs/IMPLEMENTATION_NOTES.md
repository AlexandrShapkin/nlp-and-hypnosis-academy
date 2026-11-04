# Engineering implementation notes

## Root package requirements

Create an `npm` project with Node.js LTS; pin tested compatible dependency versions with a lockfile. Expose scripts: `dev`, `start`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`. `dev` and `start` must bind to local `8080`. Choose and document exact Next, React, Drizzle, SQLite driver, auth, test and styling versions after dependency compatibility checks.

## CMS ergonomics

- Use transactional publishing and optimistic concurrency/version conflict detection.
- Implement a single block renderer registry keyed by schema type; unsupported types should fail safely and log actionable errors.
- Keep nav in a resolver service so desktop/mobile and canonical pages use the same data.
- Provide editor-friendly field-level validation and draft preview.
- Image/media URL must be generated server-side, not trust arbitrary filesystem paths.

## Content seed

Use generic, honest placeholders such as 'Specialist biography to be provided' and 'Service description pending approval' in draft data. Seed a minimal public welcome page only if no approved copy exists, without implying credentials or results. Add an admin dashboard banner indicating what needs editorial review. The initial site language must ultimately be Russian; placeholder copy in this English kit is not approved public Russian copy.

## Suggested test split

- Unit: content Zod schemas, theme token sanitization, slug normalization, URL generation, sitemap filtering.
- SQLite integration: migrations, draft/publish rollback, auto nav, redirects, seed idempotence, permissions.
- HTTP: session auth, CSRF, protected routes, form validation and rate limiting.
- Playwright: viewport desktop/mobile, login, edit hero, create/publish/unpublish card, change theme, verify SEO route/menu.

## Source verification

Reference content observed from public site HTML, but visual proportions and mobile interactions require direct inspection. If the reference is unavailable during development, use `docs/REFERENCE_BLUEPRINT.md` as the authoritative structural baseline and record visual assumptions; never block implementation on website availability.
