# Security, privacy and content integrity baseline

## Authentication and authorization

- Credentials are configured via a one-time bootstrap wizard/CLI using private environment values, not committed defaults. Hash passwords with Argon2id or a proven scrypt/bcrypt implementation and sensible cost.
- Use high-entropy session tokens stored hashed in SQLite; cookies are HttpOnly, SameSite=Lax/Strict and Secure in HTTPS production. Rotate/revoke on logout and credential change.
- All `/admin` screens and all `/api/admin/*` operations enforce server-side authorization. Hide menu items for anonymous users but never rely on hiding as authorization.
- Implement rate limiting and generic login errors to reduce brute forcing; lock out or back off repeat failures. No open registration on MVP.
- Protect state-changing requests against CSRF using trusted Origin checks plus CSRF token or a comparably robust mechanism.

## Input, rich text and uploads

- Validate requests with Zod, including URLs, slugs, enum types, nested content, limits, color codes and CSS variants.
- No raw author-provided HTML, JavaScript, CSS or SQL passed through to rendering; sanitize markdown/rich text using an allowlist.
- Escape content in the UI; use parameterized Drizzle queries; prevent open redirects and path traversal.
- Accept a constrained set of raster image types, verify MIME and file magic, impose size/dimension limits, randomize storage paths, strip active content, and reject unsafe SVG/script payloads.
- Static media served from a controlled public path in local dev; record ownership, alt text and metadata. Production must document durable media storage/backup requirements.

## Contact form and sensitive data

- Collect only necessary fields. Separate required privacy consent from optional marketing consent (unchecked by default).
- Record consent policy version/time and marketing opt-in state; do not claim compliance automatically across jurisdictions.
- Apply request/IP abuse mitigation, field limits, spam protection, and retention/deletion rules; avoid writing full leads/phone/email to debug logs.
- Use HTTPS when deployed publicly. Add a legal review checkpoint before launch (privacy, cookie usage, commercial disclosures, psychological/medical claims).
- Do not use copied reviews, false credentials, invented patient stories, or treatment guarantees. Content is maintainer-supplied and approved.

## Operational practices

- `.env.local`, SQLite `.db` files, secret keys, user uploads, backups and runtime logs are Git-ignored.
- Local development binding `127.0.0.1` is preferable; exposing a bootstrap admin setup publicly is prohibited.
- Secure defaults for security headers and `Cache-Control` on administrative/private responses.
- CI checks dependency vulnerabilities and secret leakage as feasible; destructive database commands require explicit confirmation.
