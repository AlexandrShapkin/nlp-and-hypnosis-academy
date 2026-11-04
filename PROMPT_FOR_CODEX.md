# Ready-to-use Codex implementation task

You are the lead coordinator for repository `AlexandrShapkin/nlp-and-hypnosis-academy`, checked out at `/home/user/Projects/nlp-and-hypnosis-academy`.

Implement the complete MVP defined in `AGENTS.md`, `ROADMAP.md`, and `docs/*.md`. The reference is https://nlptrainingcenter.ru/: recreate its nine-section information architecture in an original, maintainable design, without copying its assets, code, or other protected materials. Build a TypeScript Next.js public frontend and TypeScript backend/API with SQLite via Drizzle. The app and admin dashboard must work at `http://localhost:8080`.

Use the project's Codex multi-agent configuration. You are the **orchestrator**, not a fourth implementation worker. At the start of implementation, spawn exactly **three implementation subagents**, `public_site`, `content_backend`, and `maintainer_admin`, with non-overlapping file ownership as specified in `docs/TEAM_PROTOCOL.md`. You own shared contracts and integration. Parallelize independent work, wait for handoffs, integrate, run automated and browser tests, and fix failures.

After the three workers' integrated deliverables pass basic tests, spawn `acceptance_reviewer` separately as an **independent, read-only acceptance agent**. Require a structured pass/fail report with reproduction evidence for every blocker. Address blocking findings and request another review. Do not call a task complete before reviewer sign-off.

Required product outcomes:
- Admin-managed public homepage following header/hero/stats/about/problem areas/services/testimonials/contact/footer.
- CRUD of pages, sections, cards, reusable content, media, nav items, global settings, legal pages, and SEO fields.
- Create a card in the admin UI; on publish, by default automatically add a working navigation link to its canonical standalone page (`/topics/<slug>`) or explicit in-page anchor. Unpublish removes the public link. Editing a slug preserves a 301 redirect.
- Public SSR metadata, canonical URLs, Open Graph, JSON-LD where applicable, semantic H1/H2, XML sitemap, robots, redirect management, SEO editor, and draft noindex behavior.
- An admin style editor that changes approved sitewide design tokens and per-component variants, with preview, validation, publish, and rollback.
- Maintainer authentication, session management, CSRF defenses, safe uploads, consent-aware contact form, and audit logging.
- Seed placeholder content without misrepresenting the therapist or copying reference content. Surface obvious TODO markers only inside the admin UI, not as fake public credentials or testimonials.
- Automated tests for publish/navigation/SEO/auth/redirects/content/theme, responsive browser smoke tests, and build/typecheck/lint pass.

Operational constraints:
- Use one server process and only port 8080 for local evaluation. Implement `npm run dev`, `npm run start`, `npm run db:migrate`, `npm run db:seed`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`.
- Follow the versioned contracts in `contracts/` or document and test any necessary evolution.
- Use `docs/DECISIONS.md` for architecture changes and `ROADMAP.md` for progress.
- If source copy/media/credentials are unavailable, use neutral placeholder states and admin onboarding; do not ask questions that block the technical implementation.

Finish by reporting the files created, architecture, commands actually executed and results, available preview address, setup steps, remaining limitations, and the independent review result. Do not claim the server was verified unless it was actually run and queried.
