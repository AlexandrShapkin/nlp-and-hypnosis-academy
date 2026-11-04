# Repository instructions for Codex

## Mission
Build a complete, secure, editor-operated, content-driven website for NLP & Hypnosis Academy using the reference site's **information architecture** as the baseline, not its copyrighted content or source code. Public site language is Russian (`ru-RU`); code, documentation, identifiers, comments, commit messages, and agent reports are in English.

## Non-negotiable requirements
- Repository: `AlexandrShapkin/nlp-and-hypnosis-academy`.
- Target checkout: `/home/user/Projects/nlp-and-hypnosis-academy`.
- Single local HTTP origin: `http://localhost:8080`; public routes and admin APIs share this origin.
- Frontend and backend are TypeScript. SQLite is the only required database.
- Every page, section, card, navigation label, footer item, media reference, SEO field, and theme token can be managed by an authenticated maintainer without source edits.
- New published, navigation-enabled cards MUST create working menu links automatically; unpublished cards must not appear in public navigation or XML sitemaps.
- Use server rendering and proper metadata for SEO. Do not build a crawler-invisible client-only SPA.
- No secrets in Git or starter fixtures. Never use hard-coded default admin passwords.
- The acceptance reviewer must be independent of code implementation and must be consulted before declaring completion.

## Operating model: one coordinator, three implementation subagents, one reviewer
The **primary Codex thread is the coordinator/orchestrator**. Delegate the initial independent work to exactly these three named project-scoped agents:
1. `public_site` — public UI, semantic sections, styling integration, SEO rendering.
2. `content_backend` — SQLite schema, migrations, server contracts, authentication, publishing, forms.
3. `maintainer_admin` — admin UI, card/page editor, nav controls, media and theme editing.

At acceptance time, spawn `acceptance_reviewer` as the **independent fourth subagent** (read-only), only after implementation workers have delivered an integrated build. Do not have the reviewer implement code or silently waive findings. Max four spawned threads, excluding the coordinator; only three implementation subagents run concurrently. Review blockers go back to the owning worker, followed by a fresh review.

The coordinator owns root-level configuration, dependency decisions, shared type contracts, integration, Git operations, planning and release status. Resolve overlapping file ownership before spawning work. See `docs/TEAM_PROTOCOL.md`.

## Implementation conventions
- Use Next.js App Router, TypeScript strict mode, Drizzle ORM with SQLite, Zod, and CSS custom properties for editable design tokens.
- Organize public route handlers and server components so no administrative data is serialized into public responses. Never import server database code into client components.
- Reusable components use typed schemas and validated content. No arbitrary JavaScript or unsanitized HTML in author-controlled content.
- Database migrations are deterministic and versioned. A seed process is idempotent and does not overwrite edited content.
- Admin forms offer draft preview and explicit publish/unpublish; public renders only published snapshots.
- Centralize card URL resolution, navigation generation, and SEO canonical paths. Slug changes create permanent redirects.
- Maintain keyboard accessibility, responsive layouts, image alt text, loading priorities, and explicit consent for forms.
- Keep ports, commands, and paths documented. Prefer `127.0.0.1:8080` for local bind; `localhost:8080` is the browser address.

## Execution protocol
1. Inspect repository state and existing files. Do not delete existing work.
2. Read `PROMPT_FOR_CODEX.md`, `ROADMAP.md`, and domain docs relevant to the work.
3. Make a milestone plan; establish shared contracts before implementation parallelism.
4. Delegate disjoint work to the three named workers. Collect concise handoffs (files, contract changes, commands, tests, limitations).
5. Integrate at the end of every milestone. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and browser/end-to-end checks once those commands have been created. Fix failures before proceeding.
6. Start the app and smoke-test `http://localhost:8080`, `/admin`, at least one generated `/topics/<slug>` page, `sitemap.xml`, `robots.txt`, and form submission.
7. Spawn independent reviewer; require written review against `docs/ACCEPTANCE.md` with evidence and severity. Rework blockers and rerun.
8. Update `ROADMAP.md`, `docs/DECISIONS.md` and `reports/acceptance-latest.md` with truthful status.

Do not state that any feature is implemented without runnable evidence. Avoid direct pushes, destructive Git operations, or modifying live external systems without explicit user instruction. Prefer documented assumptions over blocking on non-critical product copy.
