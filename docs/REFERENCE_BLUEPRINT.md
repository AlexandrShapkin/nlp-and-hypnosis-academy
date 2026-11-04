# Reference website blueprint

Source observed: https://nlptrainingcenter.ru/ (web structure checked November 2026). This is a **structural reference**, not a content source to scrape into production. Verify visual specifics on desktop and mobile during implementation. Never copy original logos, photographs, reviews, source code, or unlicensed text.

## Observed public homepage order

1. **Header/navigation** — logo or organization title; links to About, Services & Prices, Hypnotherapy, Workshops/Seminars, Contacts; contact number; booking CTA. Some items appear as text rather than verified standalone destination links.
2. **Hero** — specialist introduction, expertise, short value proposition, portrait photo.
3. **Credibility/statistics** — three numerical proof points, each with a caption.
4. **About/credentials** — portrait and educational/professional background list.
5. **Areas of help** — five thematic content items, each a heading and paragraph.
6. **Services & pricing** — seven service entries with titles, descriptions, and prices; booking CTA.
7. **Testimonials** — five review images and an external review/channel CTA.
8. **Contact form** — lead capture with name, phone, optional email, privacy consent, optional marketing consent, submit action.
9. **Footer** — contacts, legal identity, publications, documents/privacy links, social link.

## Reference UX expectations

- Same-page anchor navigation and a mobile-friendly collapsed menu.
- Booking CTA may link to an external provider; external URL must be maintainer-editable.
- Similar content density and visual rhythm are desired, but implementation is original.
- The original footer links to multiple legal documents; create editable legal pages, not copies.
- The reference contains specialist/medical-like claims; do not reproduce claims unless a maintainer provides verified, approved wording.

## Extended site required beyond reference

- Persistent standalone public pages for new cards (`/topics/<slug>`) with complete SEO metadata.
- Admin-controlled navigation auto-generation for newly published cards.
- Optional more general pages, articles, courses, seminars and FAQ blocks.
- Working draft/publish/revision mechanism, media library and design token editor.
- Semantic, indexable SSR routes; sitemap, robots, canonical/OG and structured data.

## Information architecture map

```
/
  #about
  #areas
  #services
  #testimonials
  #contact
/topics/<card-slug>           auto-created navigable card page
/pages/<page-slug>            optional custom page
/privacy                     maintainer-edited legal page
/terms                       maintainer-edited legal page
/admin                       private dashboard
/admin/cards                 content and card CRUD
/admin/pages                 page and section CRUD
/admin/navigation            menu structure and sort
/admin/media                 media library
/admin/theme                 design system editor
/admin/seo                   SEO fields and redirects
/admin/settings              brand, contacts, outbound links
/sitemap.xml                 published routes only
/robots.txt                  environment-aware
```

Exact section anchors can change, but the route resolver must use one source of truth and preserve published links through redirects when slugs change.
