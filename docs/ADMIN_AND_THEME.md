# Maintainer dashboard and visual design editor

## Admin information architecture

- `/admin/login` — credential login, safe failure messaging, optional future MFA.
- `/admin` — overview: pending drafts, published pages, form inquiries, recent edits.
- `/admin/pages` — create/edit page, section order, visibility, SEO, publish; homepage is editable, not hard-coded.
- `/admin/cards` — filter, create, duplicate, reorder, edit, preview, publish/unpublish and archive typed cards; navigation enabled by default on new cards.
- `/admin/navigation` — inspect automatically generated links, group and reorder entries, add manual links, hide/enable entries, choose menu label overrides.
- `/admin/media` — upload images, edit alt/caption/credit, inspect usage, replace safely.
- `/admin/theme` — change site-wide design tokens, per-section/card variants, preview, publish, rollback.
- `/admin/seo` — edit global defaults, per-card/page metadata, OG image, redirects, preview snippet.
- `/admin/settings` — site title, brand, locale, contacts, external booking URL, legal pages, social links.
- `/admin/leads` — restrict access to inquiries, filter/delete as retention rules require; never expose via public endpoint.
- `/admin/audit` — actor/action history of content changes (no raw sensitive payloads).

## Authoring flow for a new card

1. Select type (service/topic/article/event/etc.), enter title and approved content.
2. Auto-suggest human-readable transliterated slug, allow override with uniqueness validation.
3. Provide relevant image with required alt text, optional button/CTA, SEO title/description.
4. `Add to main navigation` is **checked by default**. Destination defaults to `/topics/<slug>`, or choose a valid existing section anchor.
5. Save draft -> Preview (authenticated, never indexed) -> Publish.
6. Confirm that both desktop and mobile menus link to the published card, and the page has its metadata and sitemap entry.
7. Unpublish removes both public link and indexable page; keep revision history.

## Editing every visible item

Maintainer must be able to modify header logo/text, main navigation, CTA labels/targets, hero headline/body/image, metric items, about credentials, service titles/prices/descriptions, testimonials, contact labels/recipients, footer links/legal blocks, metadata and theme. Structural block templates can be fixed initially, but content/number/order/visibility of cards and sections must be editable. No text strings other than safe UI primitives may be hard-coded in public marketing components.

## Safe theme editor

Publish validated design tokens as CSS custom properties for public rendering. Support at minimum:

| Token group | Editable values | Validation |
| --- | --- | --- |
| Brand colors | background, surface, text, muted, primary, accent, border | valid #RRGGBB or predefined palette; contrast checks |
| Typography | heading/body font family preset, scale, weight | allowlisted web-safe/bundled fonts; bounded sizes |
| Layout | content width, section vertical spacing, card gap | constrained numeric ranges |
| Shape | border radius, border style, shadow preset | named variants / bounded values |
| Controls | button size, outline/fill variant, focus style | named accessible variants |
| Hero | layout preset, image position | type-checked enums |
| Cards/sections | background/spacing/variant per instance | schema-checked properties, no raw CSS |

Example published CSS properties: `--color-primary`, `--color-surface`, `--font-heading`, `--space-section`, `--radius-card`. Map them server-side to allowed values. Show a live preview for draft tokens, clear field errors, a publish confirmation, and rollback history. Never let author-entered text become a CSS declaration or HTML attribute without validation.

## Usability requirements

- Responsive admin layout, labels, keyboard accessible controls, undo or safe cancel, save state and errors.
- Prevent accidental publication when required fields fail validation.
- Make draft and published version distinctions obvious.
- Show missing alt text and invalid destination as blockers.
- Clarify menu capacity: if many cards are published, collapse overflow into an accessible `More` menu/dropdown; do not silently drop links.

## Russian task-oriented CMS (2026-11)

The dashboard exposes homepage, upload, logo, service, appearance and public-site
shortcuts. Basic forms show Russian names and visual media selectors; page
addresses live under advanced settings. Sections appear in public order with
localized templates, thumbnails, duplicate/move/visibility/delete controls and
context-specific form fields. Arrow controls provide keyboard ordering.

The visual rich-text editor emits a validated document, never stored HTML.
Paste inserts plain text; bold/italic/headings/lists/links use the approved schema.
Existing plain text and published snapshots are preserved. Saved authenticated
previews reuse actual public components and are noindex. Draft page/card/theme
changes remain private until explicit publication. Settings and menu saves are
explicitly labeled as immediately applied. Unsaved editors guard navigation,
document exit, history traversal where supported, and logout.

Gallery and card selections preserve exact image order. Removing a selection
never deletes the library file. Media deletion reports reference conflicts in
Russian. Site settings offer separate header/footer logo and favicon selectors
and background previews. Theme controls show Russian color/font/layout names,
a private visual preview, explicit publication and version restore.
