# Independent Russian CMS acceptance

Verdict: **PASS**

Date: 2026-11-04.
Tested source: `feat/russian-friendly-cms`, reviewed working changes atop `65c4a74`.
Accepted source committed as `ac761b3`; follow-up documentation links the final
[pull request #2](https://github.com/AlexandrShapkin/nlp-and-hypnosis-academy/pull/2).
Reviewer: independent `acceptance_reviewer`; coordinator transcribed this report.
Environment: production build at `http://localhost:8080`, disposable SQLite and
uploads, random synthetic credentials. Existing local user data was not tested destructively.

## Executed verification

| Check | Result |
| --- | --- |
| Clean dependency install | PASS |
| Isolated migrations and idempotent seed | PASS |
| Prettier, ESLint, TypeScript, diff whitespace | PASS |
| Unit/integration tests | 51/51 PASS, 7 files |
| Worker security tests | 6/6 PASS |
| Production build/server | PASS |
| Final complete browser suite | 14/14 PASS, 36.1 seconds |
| Runtime dependency audit | Zero vulnerabilities |
| Existing local runtime/configuration fingerprints | 6/6 unchanged |

The reviewer independently executed 51 unit/integration tests, six worker safety
tests and the preceding 13-test browser suite. After remediation, the reviewer
reran the new preview regression (1/1 PASS, 6.6 seconds), final lint/typecheck/diff
checks and separate browser/API runtime probes. The coordinator ran the complete
final 14-test suite against the rebuilt final source.

## Independent runtime evidence

- Authentication, anonymous denial, CSRF and logout/session revocation passed.
- Card draft isolation, publication, automatic navigation, SSR metadata, slug 301
  and unpublication removal passed.
- Unsafe rich-text links and SVG uploads were rejected; local previews stayed noindex.
- Actual UI upload of five files, thumbnails and caption saving passed.
- Browser Back on dirty content prompted once; dismissal preserved the URL and edits.
- Admin widths 375, 768 and 1280 pixels showed no horizontal overflow.
- Custom-page preview main text exactly matched the published main text. The body
  editor remained available with other sections and a hidden hero.
- Preview had one main landmark, no admin sidebar and the public viewport width.
- Inquiry retention used «Хранить до» and a Russian-formatted date.
- Real secured OpenCode catalog retrieval passed without invoking a model.

## Findings and resolution

| Severity | Finding | Resolution / evidence |
| --- | --- | --- |
| P1 | Custom page sections without a visible hero caused preview title/body omission and hid editable public body | Editor and preview use public composition rules; hidden-hero regression and independent text comparison PASS |
| P2 | Admin shell created nested main landmarks and constrained preview width/styles | Standalone authenticated preview bypasses admin presentation; one-main/full-width runtime checks PASS |
| P2 | Retention date had a generic heading/raw ISO value | Russian label/date formatting independently verified |

Remaining P0/P1: **none**. Remaining confirmed P2: **none**.
Required remediation: **none**. Mandatory blocked checks: **none**.

## Requested user journeys

| Scenario | Result / evidence |
| --- | --- |
| 1. First login and Russian navigation | PASS — UI login, all ten destinations, reviewer |
| 2. Homepage editing | PASS — heading/description, draft, real preview, publish |
| 3. Five photographs | PASS — UI bulk upload independently; visual selection/order/public gallery in browser suite |
| 4. Header/footer logo and favicon | PASS — visual selectors and public image/icon assertions |
| 5. New service | PASS — automatic address, named section, images, menu and detail |
| 6. Section templates/order | PASS — gallery template, section and image reordering |
| 7. Design preview/publication | PASS — private draft, public CSS, rollback |
| 8. Draft protection | PASS — published snapshot isolation and unsaved navigation |
| 9. Basic SEO | PASS — title, description and social image metadata |
| 10. Validation | PASS — Russian inline error, correction and successful save |
| 11. Mobile usability | PASS — actual editing/save and responsive probes |
| 12. Data preservation | PASS — compatibility/idempotence tests and unchanged local fingerprints |
| 13. Free OpenCode implementation | User-permitted unavailability exception — catalog works, free inference failed; no model patch or savings claimed |
| 14. External worker safety | PASS — path/secret/paid-model/disallowed-patch restrictions, real filesystem/network isolation and gateway denial |

Acceptance cases A-001–A-012 are supported by executed tests and independent probes.

## OpenCode and remaining product limits

OpenCode 2.2.5 preferred and fallback execution attempts did not yield code; the
fallback explicitly returned `Free usage limit reached`. No paid provider/model
was configured. All implementation remained with Codex. External inference and
successful external patch integration are therefore not claimed. This matches
the user's explicit allowance to deliver the CMS when free delegation is unavailable.

Ordering uses accessible arrow controls rather than drag-and-drop. Settings and
menus preserve explicitly labeled immediate application; pages/cards/themes keep
separate draft publication. The pre-existing generated `next-env.d.ts` change is
preserved outside the feature commit.

Evidence: [implementation report](implementation-russian-cms.md),
[changed files](implementation-files.txt), [screenshots](screenshots/).
The independent reviewer changed no project files and implemented no production code.
