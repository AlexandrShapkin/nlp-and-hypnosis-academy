# NLP & Hypnosis Academy

Russian-language, server-rendered website and maintainer CMS. One Next.js process serves public pages, the admin dashboard and APIs at **http://localhost:8080**. Original design follows the reference's information architecture; no reference assets, testimonials or professional claims are copied.

## Local setup

Use Node.js LTS, npm and a writable npm cache. Native SQLite dependencies may require a compiler if no prebuilt binary is available.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run admin:bootstrap
npm run dev
```

Bootstrap requires private `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` environment variables. Supply them through your shell's private input or a local secrets manager; do not put passwords into committed files or command history. There is no default account or public registration endpoint. The bootstrap command creates only the first maintainer. `.env.local`, runtime SQLite data and uploads are ignored by Git.

Visit `/admin/login`, then review the onboarding checklist. Seed is idempotent and leaves existing edited records alone. It provides neutral Russian content, not verified credentials, numerical outcomes or patient testimonials. Supply approved copy, contact information, legal policies and licensed media before public launch.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development, bound to 127.0.0.1:8080 |
| `npm run build` | Production build |
| `npm run start` | Production server, same address and port |
| `npm run db:migrate` | Apply deterministic SQLite migrations |
| `npm run db:seed` | Insert missing initial content |
| `npm run admin:bootstrap` | Create initial maintainer from private environment |
| `npm run lint` | ESLint |
| `npm run typecheck` | Strict TypeScript |
| `npm test` | Unit and SQLite integration tests |
| `npm run test:e2e` | Playwright against the already-running port 8080 server |

Install a browser with `npx playwright install chromium` if needed. Browser checks bootstrap a random temporary maintainer when the database has no users and remove that account afterward. For an existing maintainer, supply private `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD` environment variables; see `tests/e2e`. Do not run editorial mutation tests against production data.

## Editing images, galleries and branding

The maintainer CMS provides visual image selection and inline uploads for page sections, cards, SEO and brand identity. Open `/admin/media` to maintain the image library; use `/admin/pages` to attach and order multiple images in any section, and `/admin/settings` to set header/footer logos and a browser icon. Existing SQLite settings remain valid; no destructive migration is needed. See [the maintainer media guide](docs/MEDIA_EDITOR_GUIDE.md).

## Managing site maintainers

The first maintainer created with `npm run admin:bootstrap` is the **owner**.
Existing accounts keep full owner access after migration `0003.sql`; no passwords
or sessions are reset.

After logging in as owner, open **Админ-панель → Мейнтейнеры сайта**.
Create a one-time invitation link for a new email address and share it privately.
There is no outgoing email service: the link is shown only once and expires after
48 hours. The recipient sets a personal password (minimum 14 characters) at
`/admin/invite`, then signs in normally.

New maintainers may manage site content and settings, but cannot access team
management. The owner can disable/re-enable their accounts, generate a new
one-time password-recovery link, and revoke pending invitations. Disabling an
account revokes all active sessions immediately. Owner accounts cannot be
deactivated or reset by other users through the CMS. Accounts are preserved for
audit history rather than permanently deleted.

Invitation and reset secrets are stored only as SHA-256 hashes. Never post
invitation links in public channels or logs. All management API operations
enforce the existing authenticated session, CSRF and role checks.

## Architecture

- `src/shared`: versioned Zod content/theme schemas and canonical URL helpers.
- `src/db`, `src/server`: SQLite/Drizzle persistence, published snapshots, sessions, validation and audit.
- `src/app/api`: authenticated CMS operations and consent-aware contact capture.
- `src/app/(site)`, `src/components/public`, `src/styles`: responsive public SSR and metadata.
- `src/app/admin`, `src/components/admin`: protected editors, drafts, explicit publishing, navigation, media, SEO and theme history.
- `src/proxy.ts`: HTTP 301 handling for stored slug aliases.
- `scripts/db.ts`: migration, idempotent seed and initial account bootstrap.
- `tests`: executable contract, integration and browser checks.

Draft edits are separate from published snapshots. Cards default to navigation enabled; publishing creates a canonical `/topics/<slug>` page and menu entry, and unpublishing removes public visibility. Plain-text content is escaped; arbitrary HTML/JS/CSS are excluded. Themes use validated tokens and CSS variables. Uploads accept validated raster images and are stored under generated names. Administrative writes enforce authentication, a trusted Origin, and a custom request header.

## Operations

Local indexing is disabled by default. For deployment, use a real HTTPS `SITE_URL` and explicitly enable `SEO_ALLOW_INDEXING=true` only after editorial/legal review. Run migrations before starting a new build. Keep SQLite and `public/uploads` on persistent storage; this MVP assumes a single application node. Stop writes before taking a coordinated backup of SQLite and media, or use SQLite's online backup facility. Test restore on a separate checkout. Migration rollback is by restoring a verified backup; do not delete runtime data as an upgrade step.

Contact submissions are retained in the private leads dashboard until a maintainer deletes them; configure and operate an appropriate retention policy before launch. The app stores inquiries and does not deliver email or integrate booking/payment services. External booking destinations are editable links.

See [ROADMAP.md](ROADMAP.md), [architecture decisions](docs/DECISIONS.md), [launch checklist](docs/LAUNCH_CHECKLIST.md), and [latest independent acceptance](reports/acceptance-latest.md) for implementation status and evidence.

### Isolated CMS regression checks

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:worker
npm run test:cms
```

`test:cms` migrates and seeds a new temporary SQLite database, creates random test
credentials, builds the application, starts it on `http://localhost:8080`, runs
Playwright, and removes only its own temporary database/uploads. Stop an existing
local server first. It never resets the normal database or uploads. Use
`node scripts/test-cms-isolated.mjs --skip-build` only after a fresh build.
Screenshots are written to `test-results/`. Free OpenCode delegation usage and
limitations are documented in `AGENTS.md`.
