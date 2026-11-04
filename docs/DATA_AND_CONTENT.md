# SQLite data model and publishing contract

This is the required logical schema, not necessarily the exact physical table names. Migrations must enforce foreign keys, unique slugs, useful indexes, SQLite WAL mode, and one transaction per publish action. All IDs are stable UUIDs or similarly collision-resistant opaque IDs.

## Core tables

| Table | Essential fields |
| --- | --- |
| `users` | `id`, `email` unique, `password_hash`, `role`, `active`, timestamps, `password_reset_required` |
| `sessions` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, timestamps |
| `pages` | `id`, `slug`, `path`, `kind` (`home`,`custom`,`legal`), `draft_revision_id`, `published_revision_id`, timestamps, archive flag |
| `sections` | `id`, `page_id`, `key`, `block_type`, `sort_order`, revision pointers, archive flag |
| `cards` | `id`, `section_id` nullable, `card_type`, `slug` unique, revision pointers, archive flag, timestamps |
| `content_revisions` | `id`, `entity_type`, `entity_id`, `schema_version`, `payload_json`, `created_by`, `created_at`, `notes` |
| `navigation_items` | `id`, `nav_group`, `target_kind` (`card`,`page`,`section`,`external`), `target_id` or safe external URL, label override, auto_generated flag, order, enabled |
| `media_assets` | `id`, `stored_key`, `original_filename`, `mime`, `size_bytes`, `width`, `height`, `alt`, `credit`, `created_by`, timestamps |
| `theme_versions` | `id`, `status` (`draft`,`published`,`superseded`), `tokens_json`, `created_by`, `created_at`, `published_at` |
| `site_settings` | `key` unique, `draft_json`, `published_json`, timestamps |
| `redirects` | `id`, `old_path` unique, `new_path`, `status_code` fixed 301, `created_at` |
| `leads` | `id`, `name`, `contact_phone`, `email` nullable, `message` nullable, `privacy_policy_version`, `marketing_opt_in`, `created_at`, `retention_until` |
| `audit_events` | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `summary_json` redacted, `created_at` |

Use further tables for form spam protection, legal-document revisioning or media usage where needed.

## Authorable content types

Block types: `hero`, `metrics`, `about`, `card_grid`, `service_list`, `testimonials`, `contact_form`, `rich_text`, `faq`, `cta`, `media_gallery`, `legal_text`, `footer`. Card types: `area`, `service`, `testimonial`, `metric`, `credential`, `topic`, `article`, `event`, `faq`.

Every content entity must carry schema-versioned, type-validated payloads with localized content and metadata; arbitrary untyped `any` JSON from the browser must never be trusted. Required fields are listed in `contracts/content-types.json`. Rich text must be a restricted safe document schema or sanitized markdown (no arbitrary inline HTML, scripts, iframes or event handlers).

## Draft, preview, publish and unpublish

1. A maintainer creates a draft card, specifying type, title, summary, content, slug, media, optional parent section, SEO metadata, and `showInNavigation` defaulting to **true**.
2. Draft save writes a new revision but never modifies the currently published revision.
3. Authenticated preview renders the draft behind noindex and access control; no public draft URLs.
4. Publish validates all fields and schema version; atomically updates `published_revision_id`, adjusts auto-generated navigation and slug map, records audit entry, then invalidates any relevant cache.
5. Newly published card with `showInNavigation=true` is automatically available at `/topics/<slug>` and appears in the intended header/mobile menu. The default is a card detail route; an explicitly selected section anchor must resolve to an existing visible element.
6. Publishing a card with `showInNavigation=false` yields its detail page (unless detail intentionally disabled), but no auto-menu entry.
7. Unpublishing makes the canonical card route 404 (or a documented 410 policy), removes generated menu entry, removes it from sitemap, and keeps its draft/revisions recoverable.
8. Slug edits of a published card create a 301 redirect from the old canonical path to the new; nav references the card ID and automatically follows the canonical path. Reject redirect loops/collisions.
9. Page, section and theme publishing follow the same draft/published separation. Theme rollback activates an earlier safe version, logged in audit history.
10. Publishing and navigation updates are transactionally consistent; readers never see a menu pointing to a missing published card.

## Seed strategy

Seed only when keys do not exist; never overwrite maintainer-created content. Use `fixtures/site-seed.example.json` as a conceptual content list. Initial seed should build a nine-section homepage with safe generic copy/placeholder blocks, legal-page scaffolds and an editable menu. Never seed fabricated medical qualifications, unconsented reviews, or unverified performance metrics. A new owner creates credentials during one-time bootstrap, never from source-controlled passwords.

## Indexes and referential constraints

- Unique normalized `cards.slug`, `pages.path`, `redirects.old_path`, and `navigation_items` generated target per nav group.
- Unique (`sections.page_id`, `sections.key`) for stable anchor IDs.
- Index sorted visible navigation, cards by section/type, revision lookups by entity, and publish status.
- Foreign keys on author, parent, asset references where representable; reject orphaned navigation targets at publish.
- SQLite connection enables `PRAGMA foreign_keys=ON`, WAL and busy timeout.

## Backups / migration

- SQLite DB file and uploaded media are persistent and excluded from Git.
- Make migration/backups part of a deployment runbook. Never destroy production DB on seed.
- A README must describe migration commands, rollback limits and local data reset behavior.
