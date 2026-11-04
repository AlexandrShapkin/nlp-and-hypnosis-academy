# Architecture and code ownership

## Chosen stack

- Next.js App Router + React with TypeScript strict mode; server components for published public pages and metadata.
- TypeScript Next route handlers/server actions for backend operations, one origin/port.
- SQLite + Drizzle ORM; Zod schema validation at all public and administrative boundaries.
- CSS Modules or utility classes with a central, validated CSS-variable theme token layer. The coordinator selects one approach for consistency.
- Vitest for unit/integration, Playwright for browser/E2E (or equivalents with comparable coverage).

## Suggested tree (created by Codex, not present in this kit)

```
src/
  app/
    layout.tsx                     # coordinator owns shared shell
    (site)/page.tsx               # public_site
    (site)/topics/[slug]/page.tsx
    (site)/pages/[slug]/page.tsx
    (site)/privacy/page.tsx
    (site)/terms/page.tsx
    admin/                         # maintainer_admin, protected
    api/admin/                     # content_backend
    api/contact/                   # content_backend
    sitemap.ts                     # public_site + backend contract
    robots.ts                      # public_site
  components/public/               # public_site
  components/admin/                # maintainer_admin
  db/schema.ts                     # content_backend
  db/migrations/                   # content_backend
  server/                          # content_backend, server-only
  shared/schemas/                  # coordinator-owned interfaces
  shared/urls.ts                   # coordinator-owned route resolver
  styles/                          # public_site, with admin token contract
public/uploads/                    # dev-only, ignored media files
scripts/                           # coordinator-owned scripts
```

## Runtime architecture

1. Incoming GET of a public URL reaches a server-rendered route.
2. Server-only read service queries published snapshot(s) from SQLite.
3. Block registry validates content (`zod`) by type, assembles HTML with safe text, images, links and metadata.
4. The same published snapshot powers navigation, breadcrumbs, sitemap, canonical URL and structured data.
5. Maintainer authenticates under `/admin` using an HTTP-only session cookie and strict server-side authorization.
6. Editor writes draft revisions; publishing performs one SQLite transaction and invalidates page and nav caches or uses dynamic rendering with no stale data.
7. Admin style editor validates theme tokens, previews draft, publishes a versioned theme; public CSS variables are generated from sanitized token values.
8. Contact form is handled server-side with validation, abuse control and explicit consent logging.

## Single port contract

- `PORT=8080` default for local dev and preview.
- `npm run dev` starts Next dev on `127.0.0.1:8080`.
- `npm run start` serves production build on the same address.
- Every server-side fetch should be relative/internal; avoid coupling to a second local port.
- `SITE_URL=http://localhost:8080` in development; swap it for the final public HTTPS origin in production.

## Module contracts

- Public route components depend on `getPublishedHome()`, `getPublishedCardBySlug()`, `getPublishedNavigation()`, `getPublishedTheme()`, and `getSiteMetadata()` abstractions.
- Admin UI depends on the documented `/api/admin/*` contract and typed JSON DTOs. All write requests require auth and validation.
- API and server code must be separately testable and must not import client components.
- Coordinator owns changes to shared types, package files, root layouts and changes to route semantics. Workers propose, coordinator integrates.

## Non-functional targets

- Indexable HTML without hydration; no essential content hidden behind JS.
- WCAG 2.2 AA intent: keyboard navigation, focus, landmarks, labels, error feedback, image alt, contrast.
- Optimized imagery (`next/image` where safe), responsive widths and appropriate sizes.
- Observability: structured server errors without exposing PII or secrets; minimal analytics with opt-in where legally required.
- Stable build/start reproducibility and deterministic DB migration lifecycle.
