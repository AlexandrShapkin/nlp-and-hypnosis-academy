# Production-launch checklist (not needed for localhost acceptance)

- [ ] Obtain reviewed Russian copy, approved portraits, service details/pricing, credentials and testimonials with consent.
- [ ] Replace `SITE_URL` with valid HTTPS domain, set `SEO_ALLOW_INDEXING=true` only when ready.
- [ ] Configure durable media and SQLite persistence/backup/restore plan; verify file permissions.
- [ ] Rotate `SESSION_SECRET`, create strong admin account, enforce HTTPS and session cookie security.
- [ ] Complete review of privacy policy, cookie consent, terms, organizational details, and marketing-consent text for actual jurisdiction.
- [ ] Review mental-health advertising/claims for accuracy and applicable professional/regulatory limits.
- [ ] Verify public business contacts, booking provider URL, emails and social destinations.
- [ ] Crawl entire website for broken links, duplicate titles, redirects, sitemap/robots correctness.
- [ ] Run e2e, dependency/security checks, accessibility and performance audits.
- [ ] Confirm monitoring, error retention limits, backup restores and incident procedure.
