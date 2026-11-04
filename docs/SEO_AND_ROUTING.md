# SEO, indexability and routing specification

## Strategy

The site is server-rendered, content-driven, and has independent indexable URLs. Use Next metadata generation on the server. Never rely on browser JS to inject essential crawlable text or metadata.

### Public SEO defaults

- `<html lang="ru">` and locale `ru-RU` for the public website.
- One semantic H1 per page; orderly H2/H3 headings from block schema; semantic links and accessible menus.
- Editable title, meta description, social description, OG/Twitter image, canonical and `noindex` flag per page/card, with global defaults.
- Canonical absolute URL is formed from `SITE_URL` and resolved path, not raw user-provided URLs.
- OG locale `ru_RU`; `og:type` chosen appropriately (`website` or `article`).
- Structured data: `Organization` and `WebSite` if the organization details are verified; `Person` and `Service` only with accurate, approved descriptions; FAQ markup only if visible page text matches and search-engine rules allow it.
- Use image alt text; responsive images; no duplicates of H1/title across distinct published pages unless editorially justified.

### Indexable route map

| Route | Source | Indexation |
| --- | --- | --- |
| `/` | published homepage and visible sections | indexable only in production |
| `/topics/[slug]` | published card detail | indexable unless explicitly noindex |
| `/pages/[slug]` | published custom page | indexable unless explicitly noindex |
| `/privacy`, `/terms` | published legal content | configurable noindex policy |
| `/sitemap.xml` | published indexable routes | always publicly accessible |
| `/robots.txt` | environment-aware directives | public |
| `/admin/*` | auth-required admin | noindex, never in sitemap |
| `/api/*` | backend | not indexable |
| preview URLs | authenticated drafts | noindex and no sitemap |

### Sitemap and robots

- Produce valid XML sitemap including only published, canonical, indexable public URLs, with `lastModified` based on actual publication changes.
- `robots.txt` includes sitemap address and disallows `/admin/` and `/api/`.
- Development/local preview defaults to `SEO_ALLOW_INDEXING=false` and sends noindex/robots disallow to avoid accidental indexing.
- Production indexation is explicitly enabled only with `SEO_ALLOW_INDEXING=true` and a real HTTPS `SITE_URL`.
- Test sitemap generation independently even while local indexing remains disabled (local robots can disallow crawlers).

### Dynamic navigation and slugs

- New card defaults to `showInNavigation=true`. Publishing creates menu item targeting `/topics/<slug>` (or validated anchor override); unpublishing deactivates the item.
- Resolver uses a card's ID, not a frozen path string; a slug edit immediately updates nav and canonical.
- Published slug changes create a permanent HTTP 301 (not JS redirect), preserve query params where safe, and prevent loops/collisions.
- Avoid canonical duplicates for trailing slash and case; choose a documented normalization policy.
- A nonexistent/unpublished card returns 404 or documented 410; never a 200 fallback placeholder.

### SEO acceptance

1. `curl -s http://localhost:8080/` contains meaningful HTML, title, description, `lang=ru` and H1.
2. Published generated card page emits its unique title, description, canonical and OG tags before client hydration.
3. Unpublished content is absent from public HTML, navigation and sitemap.
4. 301 redirect after slug change, and both nav and sitemap list only the new canonical URL.
5. No indexable admin, API or preview routes; no sensitive fields in page source.
6. Google Rich Results/Lighthouse-type checks may supplement but do not replace direct HTML assertions.
