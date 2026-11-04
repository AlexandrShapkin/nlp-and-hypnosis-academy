# Server API and shared DTO contract

Implementation may use Next server actions for some authenticated forms, but equivalent tested server endpoints must preserve the following semantics. All administrative mutations require authorization, an anti-CSRF strategy, Zod validation, structured errors, and audit logging. JSON responses must not expose password hashes, session tokens or lead PII outside authenticated access.

## Public operations

| Operation | Target | Contract |
| --- | --- | --- |
| GET home | `/` | SSR renders published sections/cards/navigation/theme |
| GET card | `/topics/:slug` | SSR published card detail, metadata and status 404 when hidden |
| GET page | `/pages/:slug` | SSR published standalone page |
| POST inquiry | `/api/contact` | validated name, phone, optional email/message, required privacy consent/version, optional marketing consent; rate limited |
| GET XML | `/sitemap.xml` | published indexable URLs only |
| GET robots | `/robots.txt` | environment-specific crawling policy |

## Administrative operations

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/api/admin/auth/login` | credential check, set secure session cookie, abuse controls |
| POST | `/api/admin/auth/logout` | revoke session |
| GET/POST | `/api/admin/cards` | list/filter and create typed draft card; new card nav default true |
| GET/PATCH/DELETE | `/api/admin/cards/:id` | read/save draft/archive, never directly edit published revision |
| POST | `/api/admin/cards/:id/publish` | validates/publishes revision, updates menu in a transaction |
| POST | `/api/admin/cards/:id/unpublish` | deactivates public page and auto nav |
| GET/POST | `/api/admin/pages` | create/list pages |
| PATCH/POST | `/api/admin/pages/:id` and `/publish` | edit and publish pages |
| GET/PATCH | `/api/admin/navigation` | inspect/reorder/manual links, including auto links |
| GET/POST | `/api/admin/media` | list/upload validated media |
| GET/PATCH/POST | `/api/admin/theme` and `/publish` | read/save draft and publish validated theme |
| POST | `/api/admin/theme/:id/restore` | rollback to prior revision |
| GET/PATCH | `/api/admin/settings` | brand/contact/legal/global SEO editable settings |
| GET/POST | `/api/admin/redirects` | list/add safe 301 redirects |
| GET/DELETE | `/api/admin/leads` | authorized inquiry access and retention deletion |
| GET | `/api/admin/audit` | redacted audit history |

## DTOs (normative shape)

```ts
type PublishState = 'draft' | 'published' | 'unpublished';
type NavigationTarget =
  | { kind: 'card'; cardId: string }
  | { kind: 'page'; pageId: string }
  | { kind: 'section'; sectionId: string }
  | { kind: 'external'; url: string };

type CardDraft = {
  id: string;
  type: 'area' | 'service' | 'testimonial' | 'metric' |
        'credential' | 'topic' | 'article' | 'event' | 'faq';
  slug: string;
  title: string;
  summary?: string;
  body?: unknown; // validated per card type, never arbitrary HTML
  mediaIds: string[];
  sectionId?: string;
  showInNavigation: boolean; // defaults true for newly authored cards
  navigationLabel?: string;
  navigationGroup: 'primary' | 'footer';
  seo: { title?: string; description?: string; noindex?: boolean; ogImageId?: string };
};
```

For all writes: return `{ data, version }` on success; `{ error: { code, message, fields? } }` on failure, with proper HTTP codes. `409` for slug collisions, revision conflicts and invalid publish transitions. Check optimistic revision/version on concurrent edits. All published reading APIs must filter unpublished revisions.

## Integration decisions to freeze early

- Card/section schema identifiers from `contracts/content-types.json`.
- DTO paths and version semantics shared across admin/frontend/backend.
- URL resolver: `/topics/:slug`, `/pages/:slug`, `/#:section-key`.
- Theme-token schema and generated CSS variable names.
- Cache invalidation method after any publish/unpublish/theme update.

The coordinator must record any deviations and update this document plus the test suite before workers rely on them.

## Executable v1 details

The executable Zod/TypeScript contract is `src/shared/content.ts`. Responses retain `{data,version}`. Entity data is `{id,version,state,draft,published}`; mutations send the expected integer `version`. Sections are embedded in revisioned page snapshots (CRUD/order/visibility through page editing). Reusable cards refer to section IDs. Rich text `body` is escaped plain text; type-specific section labels use constrained scalar `data`. The conceptual JSON registry is normalized to this representation rather than accepting arbitrary rich documents.

Global settings use optimistic versioned immediate publication; the settings editor labels this operation explicitly. Pages/cards/themes retain explicit draft and publish operations. Media metadata supports PATCH and safe DELETE in addition to upload/list. Administrative writes send `X-Requested-With: CMS` and exact trusted Origin; login validates Origin. There is no cross-origin API grant or open account registration.

Publication validates required visible block headings, required narrative bodies, CTA destinations/labels and contact submit labels. Incomplete hidden blocks may remain in drafts. The v1 `privacyPolicyPageId` concept is normalized to the canonical `/privacy` page: a visible published contact form requires that page to be published, and the policy cannot be renamed/removed while such forms remain public. Hide and publish affected forms before intentionally removing their policy. Privacy policy versions must be nonblank.

Published public DTOs optionally include a real `publishedAt` event timestamp. Global SEO noindex applies to all public metadata and sitemap; per-entity SEO overrides global image/description defaults. Public raster delivery uses `GET /uploads/:generatedUuid.webp`, validated against media ownership records, so new uploads work without restarting Next.
