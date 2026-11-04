import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, sqlite } from "@/db";
import { entities } from "@/db/schema";
import {
  cardSchema,
  pageSchema,
  themeSchema,
  settingsSchema,
  defaultTheme,
  safeUrlSchema,
  type CardDraft,
  type PageDraft,
  type Entity,
  type Theme,
  type Settings,
  type NavigationItem,
  type MediaAsset,
} from "@/shared/content";
import { cardUrl, pageUrl } from "@/shared/urls";
import { ApiError, conflict } from "./errors";
import { richTextPlainText } from "@/shared/rich-text";
type Draft = CardDraft | PageDraft;
type Row = typeof entities.$inferSelect;
export function audit(action: string, entityId?: string, actorId?: string) {
  sqlite
    .prepare("INSERT INTO audit(id,actor_id,action,entity_id) VALUES(?,?,?,?)")
    .run(randomUUID(), actorId || null, action, entityId || null);
}
const parse = (r: Row): Entity<Draft> => ({
  id: r.id,
  version: r.version,
  state: r.state as Entity<Draft>["state"],
  draft: JSON.parse(r.draft),
  published: r.published ? JSON.parse(r.published) : null,
});
export function listEntities(kind: string) {
  return db
    .select()
    .from(entities)
    .where(and(eq(entities.kind, kind), eq(entities.archived, 0)))
    .all()
    .map(parse);
}
export function getEntity(kind: string, id: string) {
  const row = db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.kind, kind),
        eq(entities.id, id),
        eq(entities.archived, 0),
      ),
    )
    .get();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Content not found");
  return parse(row);
}
function validate(kind: string, input: unknown): Draft {
  const value = (kind === "card" ? cardSchema : pageSchema).parse(input);
  if ("sections" in value) {
    const keys = new Set<string>();
    const ids = new Set<string>();
    for (const section of value.sections) {
      if (keys.has(section.key) || ids.has(section.id))
        throw new ApiError(
          422,
          "SECTION_DUPLICATE",
          "Section keys and IDs must be unique within a page",
        );
      keys.add(section.key);
      ids.add(section.id);
      for (const [key, v] of Object.entries(section.data)) {
        if (/url$/i.test(key) && typeof v === "string" && v)
          safeUrlSchema.parse(v);
      }
    }
  }
  return value;
}
function canonical(kind: string, d: Draft) {
  return kind === "card" ? cardUrl(d.slug) : pageUrl(d.slug);
}
function checkSlug(kind: string, id: string, d: Draft) {
  const rows = listEntities(kind);
  if (
    rows.some(
      (r) =>
        r.id !== id &&
        (r.draft.slug === d.slug || r.published?.slug === d.slug),
    )
  )
    throw conflict("Slug already in use");
  const path = canonical(kind, d);
  if (sqlite.prepare("SELECT id FROM redirects WHERE old_path=?").get(path))
    throw conflict("Slug is reserved by a redirect");
}
export function saveEntity(
  kind: string,
  input: unknown,
  id?: string,
  version?: number,
  actor?: string,
) {
  const draft = validate(kind, input);
  return sqlite.transaction(() => {
    const key = id || randomUUID();
    const previous = id ? getEntity(kind, id) : null;
    if (previous && previous.version !== version) throw conflict();
    if (
      kind === "page" &&
      previous &&
      (previous.draft.slug === "home" || previous.published?.slug === "home") &&
      draft.slug !== "home"
    )
      throw conflict("Homepage slug cannot be changed");
    if (previous) protectPrivacy(kind, previous, draft.slug);
    checkSlug(kind, key, draft);
    const v = (previous?.version || 0) + 1;
    db.insert(entities)
      .values({
        id: key,
        kind,
        slug: draft.slug,
        version: v,
        state: previous?.state || "draft",
        draft: JSON.stringify(draft),
        published: previous?.published
          ? JSON.stringify(previous.published)
          : null,
        archived: 0,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: entities.id,
        set: {
          slug: draft.slug,
          version: v,
          draft: JSON.stringify(draft),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
    sqlite
      .prepare(
        "INSERT INTO revisions(id,entity_id,payload,actor_id) VALUES(?,?,?,?)",
      )
      .run(randomUUID(), key, JSON.stringify(draft), actor || null);
    audit(previous ? "content.save" : "content.create", key, actor);
    return getEntity(kind, key);
  })();
}
function hasPublishedContactForms() {
  return (publishedEntities("page") as (PageDraft & { id: string })[]).some(
    (p) => p.sections.some((s) => s.visible && s.type === "contact_form"),
  );
}
function protectPrivacy(
  kind: string,
  previous: Entity<Draft>,
  nextSlug?: string,
) {
  if (
    kind === "page" &&
    (previous.draft.slug === "privacy" ||
      previous.published?.slug === "privacy") &&
    nextSlug !== "privacy" &&
    hasPublishedContactForms()
  )
    throw conflict(
      "Published contact forms require the canonical privacy page; hide those forms before removing or renaming it",
    );
}
function validatePublishedBlocks(d: Draft) {
  if (!("sections" in d)) return;
  for (const [index, block] of d.sections.entries()) {
    if (!block.visible) continue;
    if (!block.heading.trim())
      throw new ApiError(
        422,
        "BLOCK_REQUIRED",
        `Section ${block.heading || "Без названия"} requires a heading`,
        { [`sections.${index}.heading`]: ["Заполните заголовок раздела."] },
      );
    if (
      ["hero", "about", "rich_text", "legal_text"].includes(block.type) &&
      !(
        block.bodyRichText ? richTextPlainText(block.bodyRichText) : block.body
      ).trim()
    )
      throw new ApiError(
        422,
        "BLOCK_REQUIRED",
        `Section ${block.heading || "Без названия"} requires body text`,
        { [`sections.${index}.bodyRichText`]: ["Добавьте текст раздела."] },
      );
    if (block.type === "cta") {
      if (
        typeof block.data.ctaLabel !== "string" ||
        !block.data.ctaLabel.trim()
      )
        throw new ApiError(
          422,
          "BLOCK_REQUIRED",
          `Section ${block.heading || "Без названия"} requires a CTA label`,
          { [`sections.${index}.data.ctaLabel`]: ["Введите текст кнопки."] },
        );
      if (
        typeof block.data.ctaUrl !== "string" ||
        !safeUrlSchema.safeParse(block.data.ctaUrl).success
      )
        throw new ApiError(
          422,
          "BLOCK_REQUIRED",
          `Section ${block.heading || "Без названия"} requires a safe CTA destination`,
          {
            [`sections.${index}.data.ctaUrl`]: [
              "Выберите безопасную ссылку для кнопки.",
            ],
          },
        );
    }
    if (block.type === "contact_form") {
      if (
        typeof block.data.submitLabel !== "string" ||
        !block.data.submitLabel.trim()
      )
        throw new ApiError(
          422,
          "BLOCK_REQUIRED",
          `Section ${block.heading || "Без названия"} requires a submit label`,
          {
            [`sections.${index}.data.submitLabel`]: [
              "Введите текст кнопки отправки.",
            ],
          },
        );
      if (!publishedEntities("page").some((p) => p.slug === "privacy"))
        throw new ApiError(
          422,
          "PRIVACY_REQUIRED",
          "Publish the canonical privacy page before publishing a contact form",
        );
    }
  }
}
function checkReferences(d: Draft) {
  const mediaIds = "mediaIds" in d ? d.mediaIds : [];
  for (const id of [
    ...mediaIds,
    ...(d.seo.ogImageId ? [d.seo.ogImageId] : []),
    ...("sections" in d
      ? d.sections.flatMap((s) => [
          ...(s.imageId ? [s.imageId] : []),
          ...(Array.isArray(s.data.mediaIds) ? s.data.mediaIds : []),
        ])
      : []),
  ]) {
    const asset = getMediaList().find((m) => m.id === id);
    if (!asset || !asset.alt.trim())
      throw new ApiError(
        422,
        "MEDIA_INVALID",
        "All referenced images need alternative text",
      );
  }
  if ("anchor" in d && d.anchor) {
    const home = listEntities("page").find((p) => p.published?.slug === "home")
      ?.published as PageDraft | undefined;
    if (!home?.sections.some((s) => s.visible && s.key === d.anchor))
      throw new ApiError(
        422,
        "ANCHOR_INVALID",
        "Choose a visible homepage section",
      );
  }
}
export function publishEntity(
  kind: string,
  id: string,
  version: number,
  actor?: string,
) {
  return sqlite.transaction(() => {
    const e = getEntity(kind, id);
    if (e.version !== version) throw conflict();
    const draft = validate(kind, e.draft);
    if (
      kind === "page" &&
      (e.draft.slug === "home" || e.published?.slug === "home") &&
      draft.slug !== "home"
    )
      throw conflict("Homepage slug cannot be changed");
    protectPrivacy(kind, e, draft.slug);
    validatePublishedBlocks(draft);
    checkSlug(kind, id, draft);
    checkReferences(draft);
    if (kind === "page" && draft.slug === "home" && "sections" in draft) {
      const visibleKeys = new Set(
        draft.sections.filter((s) => s.visible).map((s) => s.key),
      );
      const orphan = (
        publishedEntities("card") as (CardDraft & { id: string })[]
      ).find(
        (c) => c.showInNavigation && c.anchor && !visibleKeys.has(c.anchor),
      );
      if (orphan)
        throw conflict(
          `Section is used by published navigation: ${orphan.title}`,
        );
    }
    if (e.published && e.published.slug !== draft.slug)
      addRedirect(canonical(kind, e.published), canonical(kind, draft), actor);
    db.update(entities)
      .set({
        published: JSON.stringify(draft),
        state: "published",
        version: e.version + 1,
      })
      .where(eq(entities.id, id))
      .run();
    sqlite
      .prepare(
        "INSERT INTO publication_events(entity_id,published_at) VALUES(?,?) ON CONFLICT(entity_id) DO UPDATE SET published_at=excluded.published_at",
      )
      .run(id, new Date().toISOString());
    audit("content.publish", id, actor);
    return getEntity(kind, id);
  })();
}
export function unpublishEntity(
  kind: string,
  id: string,
  version: number,
  actor?: string,
  archive = false,
) {
  return sqlite.transaction(() => {
    const e = getEntity(kind, id);
    if (e.version !== version) throw conflict();
    if (
      kind === "page" &&
      (e.draft.slug === "home" || e.published?.slug === "home")
    )
      throw conflict("Homepage cannot be removed");
    protectPrivacy(kind, e);
    db.update(entities)
      .set({
        published: null,
        state: "unpublished",
        version: e.version + 1,
        archived: archive ? 1 : 0,
      })
      .where(eq(entities.id, id))
      .run();
    audit(archive ? "content.archive" : "content.unpublish", id, actor);
    return archive ? { id } : getEntity(kind, id);
  })();
}
export function publishedEntities(kind: string) {
  const events = new Map(
    (
      sqlite
        .prepare("SELECT entity_id,published_at FROM publication_events")
        .all() as { entity_id: string; published_at: string }[]
    ).map((row) => [row.entity_id, row.published_at]),
  );
  return listEntities(kind)
    .filter((e) => e.published)
    .map((e) => ({
      ...e.published!,
      id: e.id,
      ...(events.has(e.id) ? { publishedAt: events.get(e.id) } : {}),
    }));
}
export function getMediaList(): MediaAsset[] {
  return (
    sqlite.prepare("SELECT payload FROM media").all() as { payload: string }[]
  ).map((r) => JSON.parse(r.payload));
}
export function getTheme() {
  const r = sqlite.prepare("SELECT * FROM theme WHERE id=?").get("site") as
    | { version: number; draft: string; published: string }
    | undefined;
  return {
    version: r?.version || 1,
    draft: r ? (JSON.parse(r.draft) as Theme) : defaultTheme,
    published: r ? (JSON.parse(r.published) as Theme) : defaultTheme,
    history: (
      sqlite
        .prepare(
          "SELECT * FROM theme_history ORDER BY created_at DESC,rowid DESC",
        )
        .all() as { id: string; tokens: string; created_at: string }[]
    ).map((h) => ({
      id: h.id,
      tokens: JSON.parse(h.tokens) as Theme,
      createdAt: h.created_at,
    })),
  };
}
function contrast(a: string, b: string) {
  const lum = (s: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function validateTheme(input: unknown) {
  const t = themeSchema.parse(input);
  if (
    contrast(t.text, t.background) < 4.5 ||
    contrast(t.text, t.surface) < 4.5 ||
    contrast(t.muted, t.background) < 4.5 ||
    contrast(t.muted, t.surface) < 4.5 ||
    contrast(t.primary, t.surface) < 4.5
  )
    throw new ApiError(
      422,
      "CONTRAST",
      "Theme colors need accessible contrast",
    );
  return t;
}
export function saveTheme(input: unknown, version: number, actor?: string) {
  const tokens = validateTheme(input);
  return sqlite.transaction(() => {
    const old = getTheme();
    if (old.version !== version) throw conflict();
    sqlite
      .prepare(
        "INSERT INTO theme(id,version,draft,published) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,draft=excluded.draft",
      )
      .run(
        "site",
        version + 1,
        JSON.stringify(tokens),
        JSON.stringify(old.published),
      );
    audit("theme.save", "site", actor);
    return getTheme();
  })();
}
export function publishTheme(
  version: number,
  actor?: string,
  restoreId?: string,
) {
  return sqlite.transaction(() => {
    const old = getTheme();
    if (old.version !== version) throw conflict();
    const restore = restoreId
      ? old.history.find((h) => h.id === restoreId)
      : null;
    if (restoreId && !restore)
      throw new ApiError(404, "NOT_FOUND", "Theme revision not found");
    const tokens = validateTheme(restore?.tokens || old.draft);
    sqlite
      .prepare("UPDATE theme SET version=?,published=?,draft=? WHERE id=?")
      .run(version + 1, JSON.stringify(tokens), JSON.stringify(tokens), "site");
    sqlite
      .prepare("INSERT INTO theme_history(id,tokens) VALUES(?,?)")
      .run(randomUUID(), JSON.stringify(tokens));
    audit(restore ? "theme.restore" : "theme.publish", "site", actor);
    return getTheme();
  })();
}
export function getSettings() {
  const r = sqlite
    .prepare("SELECT payload,version FROM settings WHERE id=?")
    .get("site") as { payload: string; version: number } | undefined;
  if (!r) throw new ApiError(503, "NOT_SEEDED", "Run database seed");
  return { data: JSON.parse(r.payload) as Settings, version: r.version };
}
export function saveSettings(input: unknown, version: number, actor?: string) {
  const s = settingsSchema.parse(input);
  const available = new Set(getMediaList().map((m) => m.id));
  for (const id of [
    s.logoImageId,
    s.footerLogoImageId,
    s.faviconImageId,
    s.seo.ogImageId,
  ]) {
    if (id && !available.has(id))
      throw new ApiError(
        422,
        "INVALID_MEDIA",
        "Choose an existing image from the media library",
      );
  }
  return sqlite.transaction(() => {
    if (getSettings().version !== version) throw conflict();
    sqlite
      .prepare("UPDATE settings SET payload=?,version=version+1 WHERE id=?")
      .run(JSON.stringify(s), "site");
    audit("settings.save", "site", actor);
    return getSettings();
  })();
}
const pathSchema = z
  .string()
  .max(300)
  .regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/);
export function addRedirect(oldPath: string, newPath: string, actor?: string) {
  pathSchema.parse(oldPath);
  pathSchema.parse(newPath);
  if (oldPath === newPath) throw conflict("Redirect loop");
  let p = newPath;
  for (let i = 0; i < 30; i++) {
    if (p === oldPath) throw conflict("Redirect loop");
    const next = sqlite
      .prepare("SELECT new_path FROM redirects WHERE old_path=?")
      .get(p) as { new_path: string } | undefined;
    if (!next) break;
    p = next.new_path;
    if (i === 29) throw conflict("Redirect chain too long");
  }
  if (
    publishedEntities("card").some((e) => cardUrl(e.slug) === oldPath) ||
    publishedEntities("page").some((e) => pageUrl(e.slug) === oldPath)
  ) {
    /* Slug rename is checked by publisher; manual API checks occupied paths separately. */
  }
  sqlite
    .prepare(
      "INSERT INTO redirects(id,old_path,new_path) VALUES(?,?,?) ON CONFLICT(old_path) DO UPDATE SET new_path=excluded.new_path",
    )
    .run(randomUUID(), oldPath, newPath);
  audit("redirect.save", oldPath, actor);
}
export function resolveRedirect(path: string) {
  let p = path;
  for (let i = 0; i < 30; i++) {
    const r = sqlite
      .prepare("SELECT new_path FROM redirects WHERE old_path=?")
      .get(p) as { new_path: string } | undefined;
    if (!r) return p === path ? null : p;
    p = r.new_path;
  }
  return null;
}
export function manualNavigation(): NavigationItem[] {
  return (
    sqlite.prepare("SELECT payload FROM navigation").all() as {
      payload: string;
    }[]
  ).map((r) => JSON.parse(r.payload));
}
export function validateNavigationItem(item: NavigationItem): NavigationItem {
  const pages = publishedEntities("page") as (PageDraft & { id: string })[];
  const cards = publishedEntities("card") as (CardDraft & { id: string })[];
  let href = item.href;
  const target = item.target;
  if (target?.kind === "page" || target?.kind === "card") {
    const entity = (target.kind === "card" ? cards : pages).find(
      (e) => e.id === target.id,
    );
    if (!entity)
      throw new ApiError(
        422,
        "NAV_TARGET",
        "Navigation requires published content",
      );
    href = target.kind === "card" ? cardUrl(entity.slug) : pageUrl(entity.slug);
  } else if (target?.kind === "section") {
    const section = pages
      .find((p) => p.slug === "home")
      ?.sections.find(
        (s) => s.visible && (s.id === target.id || s.key === target.id),
      );
    if (!section)
      throw new ApiError(
        422,
        "NAV_TARGET",
        "Choose a visible homepage section",
      );
    href = `/#${section.key}`;
  } else if (target?.kind === "external" && target.url) {
    href = safeUrlSchema.parse(target.url);
  }
  if (href.startsWith("/")) {
    const [pathname, fragment] = href.split("#");
    const page = pages.find((p) => pageUrl(p.slug) === pathname);
    const card = cards.find((c) => cardUrl(c.slug) === pathname);
    if (
      (!page && !card) ||
      (fragment && !page?.sections.some((s) => s.visible && s.key === fragment))
    ) {
      throw new ApiError(
        422,
        "NAV_TARGET",
        "Navigation requires published content",
      );
    }
  }
  return { ...item, href };
}
export function publicNavigation(): NavigationItem[] {
  const cards = publishedEntities("card") as (CardDraft & { id: string })[];
  const pages = publishedEntities("page") as (PageDraft & { id: string })[];
  const visibleKeys = new Set(
    pages
      .find((p) => p.slug === "home")
      ?.sections.filter((s) => s.visible)
      .map((s) => s.key) || [],
  );
  const auto = [
    ...cards
      .filter((c) => !c.anchor || visibleKeys.has(c.anchor))
      .map((c) => ({
        ...c,
        href: c.anchor ? `/#${c.anchor}` : cardUrl(c.slug),
      })),
    ...pages.map((p) => ({ ...p, href: pageUrl(p.slug) })),
  ]
    .filter((c) => c.showInNavigation)
    .map((c, i) => ({
      id: `auto-${c.id}`,
      label: c.navigationLabel || c.title,
      href: c.href,
      group: c.navigationGroup,
      order: 100 + i,
      visible: true,
      automatic: true,
      target: {
        kind: cards.some((x) => x.id === c.id)
          ? ("card" as const)
          : ("page" as const),
        id: c.id,
      },
    }));
  const stored = manualNavigation();
  const resolvedAuto = auto
    .map((n) => {
      const override = stored.find((s) => s.id === n.id && s.automatic);
      return override
        ? {
            ...n,
            label: override.label,
            group: override.group,
            order: override.order,
            visible: override.visible,
          }
        : n;
    })
    .filter((n) => n.visible);
  return [
    ...stored
      .filter((n) => !n.automatic && n.visible)
      .map((n) => {
        const target = n.target;
        if (target?.kind === "card" || target?.kind === "page") {
          const item = (target.kind === "card" ? cards : pages).find(
            (c) => c.id === target.id,
          );
          if (!item) return null;
          return {
            ...n,
            href:
              target.kind === "card" ? cardUrl(item.slug) : pageUrl(item.slug),
          };
        }
        if (target?.kind === "section") {
          const section = pages
            .find((p) => p.slug === "home")
            ?.sections.find(
              (s) => s.visible && (s.id === target.id || s.key === target.id),
            );
          return section ? { ...n, href: `/#${section.key}` } : null;
        }
        if (
          n.href.startsWith("/topics/") &&
          !cards.some((c) => cardUrl(c.slug) === n.href)
        )
          return null;
        if (
          n.href.startsWith("/pages/") &&
          !pages.some((p) => pageUrl(p.slug) === n.href)
        )
          return null;
        if (n.href.startsWith("/#")) {
          const home = pages.find((p) => p.slug === "home");
          if (
            !home?.sections.some((s) => s.visible && s.key === n.href.slice(2))
          )
            return null;
        }
        return n;
      })
      .filter((n): n is NavigationItem => !!n),
    ...resolvedAuto,
  ].sort((a, b) => a.order - b.order);
}
