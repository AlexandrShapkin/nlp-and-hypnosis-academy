# Independent acceptance plan

The acceptance reviewer is read-only and must independently verify actual behavior. A task is **PASS** only if every P0/P1 criterion is satisfied and evidence is recorded. Record blocked checks explicitly; absence of a test is not a pass. Test local site at `http://localhost:8080`.

## Required commands (must exist when implementation is complete)

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run lint
npm run typecheck
npm test
npm run build
npm run start
# In a separate shell, test http://localhost:8080
npm run test:e2e
```

## P0/P1 product tests

- [ ] Local server listens on port 8080, homepage HTTP 200, admin route reachable, no second port required.
- [ ] Homepage contains nine required sections in reference-inspired order (header, hero, statistics, about, areas, services, testimonials, contact, footer) with content loaded from SQLite.
- [ ] Desktop and mobile menus work with keyboard; anchors scroll to correct sections; booking CTA uses editable destination.
- [ ] Maintainer login rejects anonymous access to all admin pages/endpoints; password and sessions are protected; logout revokes session.
- [ ] Maintainer edits hero text/image, stats, services/prices, reviews, contact/footer/legal text; published site reflects changes without code edits.
- [ ] Maintainer creates a new card, saves draft: public page/menu/sitemap do not show the draft.
- [ ] Maintainer publishes that card with default navigation option: new menu item appears in desktop and mobile, `/topics/<slug>` returns HTTP 200 with content/SEO metadata, public XML sitemap lists the new URL (when sitemap indexation criteria are met).
- [ ] Unpublishing the card removes it from both menus and sitemap and hides the public route.
- [ ] Changing a published card slug produces valid HTTP 301 old -> new; nav link and sitemap use only new URL.
- [ ] Maintainer creates a custom page and can control visibility and navigation, with an indexable public route on publish.
- [ ] Theme editor changes color/spacing/typography safely and publishes new CSS variables visible publicly; draft preview is private; rollback restores earlier published theme.
- [ ] Content rich text/media sanitize untrusted input; dangerous upload and script injection are blocked.
- [ ] Contact form validates required fields, records separate privacy and marketing consent states, and prevents obvious spam; no lead is public.
- [ ] SSR page source includes `lang=ru`, unique H1, metadata, canonical and OG tags. SEO fields are edited in admin.
- [ ] `/robots.txt`, `/sitemap.xml`, 404 for unpublished routes, and admin/API noindex behavior follow the environment policy.
- [ ] No copied reference photos, testimonials, legal copy, credentials or unsupported claims appear in seeded site.
- [ ] No secrets, credentials, DB file or PII are committed.
- [ ] All required lint/typecheck/unit/build/e2e commands complete successfully.

## Security checks

- Anonymous `POST /api/admin/cards` => 401 or 403.
- Invalid `slug`, malicious rich text and CSS payloads => validation failure or safe escaped output.
- Login rate limiting/CSRF defense is exercised and documented.
- Path traversal attempt in media upload does not write outside upload directory.
- Admin/private content has no shared public cache.
- SQL schema migration can run on a clean DB and seed can run twice without duplication or overwriting edits.

## SEO and accessibility checks

- `curl` page source (no JS) includes real text and valid H1/H2 structure.
- Published indexable topic is included in sitemap; draft is excluded.
- Local preview has `SEO_ALLOW_INDEXING=false`, so robots disallow and noindex; production mode with proper HTTPS site URL can be verified in tests.
- Check accessible labels, focus visibility, contrast and nav keyboard interactions; report Lighthouse/axe findings if available.
- No broken image URLs; avoid layout shift; use responsive image sizes.

## Required report format

```
Verdict: PASS | CONDITIONAL | FAIL
Date and tested commit:
Environment and address:
Executed commands and outcomes:
Browser / curl evidence:
P0 findings:
P1 findings:
P2 / P3 findings:
Blocked checks (with reasons):
Acceptance scenario checklist results:
Required remediation before sign-off:
```

A CONDITIONAL result does not count as full acceptance when P0/P1 or blocked mandatory tests remain.
