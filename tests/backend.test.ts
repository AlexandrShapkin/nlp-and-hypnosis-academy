import { beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
process.env.DATABASE_URL = `file:${path.join(mkdtempSync(path.join(tmpdir(), "academy-test-")), "test.sqlite")}`;
let store: typeof import("../src/server/store");
let auth: typeof import("../src/server/auth");
let sqlite: (typeof import("../src/db"))["sqlite"];
beforeAll(async () => {
  store = await import("../src/server/store");
  auth = await import("../src/server/auth");
  sqlite = (await import("../src/db")).sqlite;
  const { seed } = await import("../src/server/seed");
  seed();
});
describe("SQLite content lifecycle", () => {
  it("seed is idempotent and does not overwrite edits", async () => {
    const { seed } = await import("../src/server/seed");
    const count = store.listEntities("page").length;
    const settings = store.getSettings();
    store.saveSettings(
      { ...settings.data, brandLabel: "Edited brand" },
      settings.version,
    );
    seed();
    expect(store.listEntities("page")).toHaveLength(count);
    expect(store.getSettings().data.brandLabel).toBe("Edited brand");
  });
  it("draft invisible; publish automatic nav; draft edits do not leak; rename redirect; unpublish removes", () => {
    let e = store.saveEntity("card", {
      slug: "test-publish",
      title: "Test card",
    });
    expect(e.draft.showInNavigation).toBe(true);
    expect(store.publishedEntities("card").some((c) => c.id === e.id)).toBe(
      false,
    );
    expect(
      store.publicNavigation().some((n) => n.href === "/topics/test-publish"),
    ).toBe(false);
    e = store.publishEntity("card", e.id, e.version);
    expect(
      store.publicNavigation().some((n) => n.href === "/topics/test-publish"),
    ).toBe(true);
    const stale = e.version;
    e = store.saveEntity(
      "card",
      { ...e.draft, slug: "test-renamed", title: "New title" },
      e.id,
      e.version,
    );
    expect(
      store.publishedEntities("card").find((c) => c.id === e.id)?.title,
    ).toBe("Test card");
    expect(() => store.publishEntity("card", e.id, stale)).toThrow(
      "Revision conflict",
    );
    e = store.publishEntity("card", e.id, e.version);
    expect(store.resolveRedirect("/topics/test-publish")).toBe(
      "/topics/test-renamed",
    );
    expect(
      store.publicNavigation().some((n) => n.href === "/topics/test-publish"),
    ).toBe(false);
    store.unpublishEntity("card", e.id, e.version);
    expect(
      store.publicNavigation().some((n) => n.href === "/topics/test-renamed"),
    ).toBe(false);
    expect(store.publishedEntities("card").some((c) => c.id === e.id)).toBe(
      false,
    );
  });
  it("publication timestamps change only on successful publication", async () => {
    const { migrate } = await import("../src/db");
    migrate();
    migrate();
    const journal = sqlite
      .prepare("SELECT name FROM migration_journal ORDER BY name")
      .all();
    expect(journal).toEqual([{ name: "0001.sql" }, { name: "0002.sql" }]);
    let e = store.saveEntity("card", {
      slug: "publication-time",
      title: "Publication time",
    });
    e = store.publishEntity("card", e.id, e.version);
    expect(
      store.publishedEntities("card").find((c) => c.id === e.id)?.publishedAt,
    ).toMatch(/^\d{4}-/);
    sqlite
      .prepare("UPDATE publication_events SET published_at=? WHERE entity_id=?")
      .run("2020-01-01T00:00:00.000Z", e.id);
    e = store.saveEntity(
      "card",
      { ...e.draft, title: "Unpublished update" },
      e.id,
      e.version,
    );
    expect(
      store.publishedEntities("card").find((c) => c.id === e.id)?.publishedAt,
    ).toBe("2020-01-01T00:00:00.000Z");
    e = store.publishEntity("card", e.id, e.version);
    expect(
      store.publishedEntities("card").find((c) => c.id === e.id)?.publishedAt,
    ).not.toBe("2020-01-01T00:00:00.000Z");
    sqlite
      .prepare("DELETE FROM publication_events WHERE entity_id=?")
      .run(e.id);
    expect(
      store.publishedEntities("card").find((c) => c.id === e.id)?.publishedAt,
    ).toBeUndefined();
  });
  it("published card order follows published snapshots rather than drafts", async () => {
    const { getPublishedCards } = await import("../src/server/public");
    let a = store.saveEntity("card", {
      slug: "order-first",
      title: "First",
      order: 2,
    });
    let b = store.saveEntity("card", {
      slug: "order-second",
      title: "Second",
      order: 8,
    });
    a = store.publishEntity("card", a.id, a.version);
    b = store.publishEntity("card", b.id, b.version);
    const selected = async () =>
      (await getPublishedCards())
        .filter((c) => c.id === a.id || c.id === b.id)
        .map((c) => c.id);
    expect(await selected()).toEqual([a.id, b.id]);
    b = store.saveEntity("card", { ...b.draft, order: 1 }, b.id, b.version);
    expect(await selected()).toEqual([a.id, b.id]);
    b = store.publishEntity("card", b.id, b.version);
    expect(await selected()).toEqual([b.id, a.id]);
  });
  it("rejects duplicate slugs and invalid navigation anchors atomically", () => {
    const one = store.saveEntity("card", { slug: "collision", title: "One" });
    expect(() =>
      store.saveEntity("card", { slug: "collision", title: "Two" }),
    ).toThrow("Slug already in use");
    const bad = store.saveEntity("card", {
      slug: "bad-anchor",
      title: "Bad anchor",
      anchor: "not-there",
    });
    expect(() => store.publishEntity("card", bad.id, bad.version)).toThrow(
      "visible homepage section",
    );
    expect(store.getEntity("card", bad.id).published).toBeNull();
    expect(one.version).toBe(1);
  });
  it("keeps incomplete block drafts saveable but enforces visible publication fields", () => {
    for (const [index, type] of [
      "hero",
      "about",
      "rich_text",
      "legal_text",
      "cta",
      "contact_form",
    ].entries()) {
      const block = {
        id: `required-${index}`,
        key: `required-${index}`,
        type,
        heading: type === "hero" ? " " : "Required section",
        body: "",
        visible: true,
        variant: "default",
        data: {},
      };
      const page = store.saveEntity("page", {
        slug: `required-page-${index}`,
        title: "Required fields",
        sections: [block],
      });
      expect(() => store.publishEntity("page", page.id, page.version)).toThrow(
        /requires/,
      );
      expect(store.getEntity("page", page.id).published).toBeNull();
    }
    const hidden = store.saveEntity("page", {
      slug: "hidden-incomplete",
      title: "Hidden incomplete",
      sections: [
        {
          id: "hidden",
          key: "hidden",
          type: "hero",
          heading: "",
          body: "",
          visible: false,
        },
      ],
    });
    expect(() =>
      store.publishEntity("page", hidden.id, hidden.version),
    ).not.toThrow();
    const cta = store.saveEntity("page", {
      slug: "required-cta-url",
      title: "CTA",
      sections: [
        {
          id: "cta",
          key: "cta",
          type: "cta",
          heading: "CTA",
          data: { ctaLabel: "Continue", ctaUrl: "" },
        },
      ],
    });
    expect(() => store.publishEntity("page", cta.id, cta.version)).toThrow(
      "safe CTA destination",
    );
  });
  it("preserves canonical privacy while forms are public and requires it for new forms", () => {
    let privacy = store
      .listEntities("page")
      .find((p) => p.published?.slug === "privacy")!;
    let home = store
      .listEntities("page")
      .find((p) => p.published?.slug === "home")!;
    const original = home.draft as import("../src/shared/content").PageDraft;
    expect(() =>
      store.unpublishEntity("page", privacy.id, privacy.version),
    ).toThrow("canonical privacy page");
    expect(() =>
      store.saveEntity(
        "page",
        { ...privacy.draft, slug: "renamed-policy" },
        privacy.id,
        privacy.version,
      ),
    ).toThrow("canonical privacy page");
    home = store.saveEntity(
      "page",
      {
        ...original,
        sections: original.sections.map((s) =>
          s.type === "contact_form" ? { ...s, visible: false } : s,
        ),
      },
      home.id,
      home.version,
    );
    home = store.publishEntity("page", home.id, home.version);
    privacy = store.unpublishEntity(
      "page",
      privacy.id,
      privacy.version,
    ) as typeof privacy;
    const form = store.saveEntity("page", {
      slug: "requires-privacy",
      title: "Form",
      sections: [
        {
          id: "form",
          key: "form",
          type: "contact_form",
          heading: "Contact",
          data: { submitLabel: "Send" },
        },
      ],
    });
    expect(() => store.publishEntity("page", form.id, form.version)).toThrow(
      "canonical privacy page",
    );
    privacy = store.publishEntity("page", privacy.id, privacy.version);
    store.publishEntity("page", form.id, form.version);
    home = store.saveEntity("page", original, home.id, home.version);
    store.publishEntity("page", home.id, home.version);
    expect(
      store.publishedEntities("page").some((p) => p.slug === "privacy"),
    ).toBe(true);
  });
  it("homepage identity cannot be renamed or unpublished", () => {
    const home = store
      .listEntities("page")
      .find((e) => e.published?.slug === "home")!;
    expect(() =>
      store.saveEntity(
        "page",
        { ...home.draft, slug: "renamed-home" },
        home.id,
        home.version,
      ),
    ).toThrow("Homepage slug cannot be changed");
    expect(() => store.unpublishEntity("page", home.id, home.version)).toThrow(
      "Homepage cannot be removed",
    );
    expect(store.publishedEntities("page").some((p) => p.slug === "home")).toBe(
      true,
    );
  });
  it("published homepage guard survives legacy draft corruption", () => {
    const home = store
      .listEntities("page")
      .find((e) => e.published?.slug === "home")!;
    sqlite
      .prepare("UPDATE entities SET draft=? WHERE id=?")
      .run(
        JSON.stringify({ ...home.draft, slug: "legacy-renamed-home" }),
        home.id,
      );
    try {
      expect(() =>
        store.unpublishEntity("page", home.id, home.version),
      ).toThrow("Homepage cannot be removed");
      expect(() => store.publishEntity("page", home.id, home.version)).toThrow(
        "Homepage slug cannot be changed",
      );
    } finally {
      sqlite
        .prepare("UPDATE entities SET draft=? WHERE id=?")
        .run(JSON.stringify(home.draft), home.id);
    }
  });
  it("anchor keys require visible sections and prevent orphaned homepage publication", () => {
    let home = store
      .listEntities("page")
      .find((e) => e.published?.slug === "home")!;
    const homeDraft = home.draft as import("../src/shared/content").PageDraft;
    home = store.saveEntity(
      "page",
      {
        ...homeDraft,
        sections: [
          ...homeDraft.sections,
          {
            id: "stable-anchor-id",
            key: "anchor-key",
            type: "rich_text",
            heading: "Anchor",
            body: "Body",
            visible: true,
            variant: "default",
            data: {},
          },
        ],
      },
      home.id,
      home.version,
    );
    home = store.publishEntity("page", home.id, home.version);
    let card = store.saveEntity("card", {
      slug: "anchored-card",
      title: "Anchored",
      anchor: "stable-anchor-id",
    });
    expect(() => store.publishEntity("card", card.id, card.version)).toThrow(
      "visible homepage section",
    );
    card = store.saveEntity(
      "card",
      { ...card.draft, anchor: "anchor-key" },
      card.id,
      card.version,
    );
    card = store.publishEntity("card", card.id, card.version);
    expect(
      store.publicNavigation().find((n) => n.id === `auto-${card.id}`)?.href,
    ).toBe("/#anchor-key");
    const sections = (
      home.draft as import("../src/shared/content").PageDraft
    ).sections.map((s) =>
      s.key === "anchor-key" ? { ...s, visible: false } : s,
    );
    home = store.saveEntity(
      "page",
      { ...home.draft, sections },
      home.id,
      home.version,
    );
    expect(() => store.publishEntity("page", home.id, home.version)).toThrow(
      "Section is used by published navigation",
    );
    store.unpublishEntity("card", card.id, card.version);
    store.publishEntity("page", home.id, home.version);
    expect(
      store.publicNavigation().some((n) => n.href === "/#anchor-key"),
    ).toBe(false);
  });
  it("page publish makes generated navigation available", () => {
    const e = store.saveEntity("page", {
      slug: "custom-page",
      title: "Custom",
      showInNavigation: true,
    });
    store.publishEntity("page", e.id, e.version);
    expect(
      store.publicNavigation().some((n) => n.href === "/pages/custom-page"),
    ).toBe(true);
  });
  it("automatic navigation overrides remain canonical and disappear on unpublish", () => {
    let e = store.saveEntity("card", {
      slug: "nav-override",
      title: "Navigation",
    });
    e = store.publishEntity("card", e.id, e.version);
    const n = {
      id: `auto-${e.id}`,
      label: "Override",
      href: "/topics/nav-override",
      group: "footer",
      order: 1,
      visible: true,
      automatic: true,
    };
    sqlite
      .prepare("INSERT INTO navigation(id,payload) VALUES(?,?)")
      .run(n.id, JSON.stringify(n));
    expect(store.publicNavigation().find((x) => x.id === n.id)?.label).toBe(
      "Override",
    );
    e = store.saveEntity(
      "card",
      { ...e.draft, slug: "nav-override-new" },
      e.id,
      e.version,
    );
    e = store.publishEntity("card", e.id, e.version);
    expect(store.publicNavigation().find((x) => x.id === n.id)?.href).toBe(
      "/topics/nav-override-new",
    );
    store.unpublishEntity("card", e.id, e.version);
    expect(store.publicNavigation().find((x) => x.id === n.id)).toBeUndefined();
  });
  it("rejects redirect loops and unsafe targets", () => {
    store.addRedirect("/old-a", "/new-a");
    expect(() => store.addRedirect("/new-a", "/old-a")).toThrow(
      "Redirect loop",
    );
    expect(() => store.addRedirect("/unsafe", "//evil.example")).toThrow();
  });
  it("theme draft isolation, validation, publish and rollback", () => {
    const t = store.getTheme();
    const draft = store.saveTheme(
      { ...t.draft, primary: "#17483d" },
      t.version,
    );
    expect(draft.published.primary).toBe(t.published.primary);
    const pub = store.publishTheme(draft.version);
    expect(pub.published.primary).toBe("#17483d");
    const restored = store.publishTheme(pub.version, undefined, "initial");
    expect(restored.published.primary).toBe(t.published.primary);
    expect(() =>
      store.validateTheme({ ...t.draft, primary: "red;display:none" }),
    ).toThrow();
    expect(() =>
      store.validateTheme({ ...t.draft, text: t.draft.background }),
    ).toThrow("contrast");
    expect(() =>
      store.validateTheme({ ...t.draft, primary: "#777777" }),
    ).toThrow("contrast");
    expect(() =>
      store.validateTheme({
        ...t.draft,
        background: "#ffffff",
        surface: "#f7f5ef",
        muted: "#767676",
      }),
    ).toThrow("contrast");
  });
  it("retains safely escaped text as text and rejects invalid CSS enum", () => {
    const e = store.saveEntity("card", {
      slug: "escaped-text",
      title: "<script>alert(1)</script>",
      body: "<img src=x onerror=alert(1)>",
    });
    expect(e.draft.title).toContain("<script>");
    expect(() =>
      store.saveEntity("card", {
        slug: "bad-style",
        title: "Bad",
        variant: "url(javascript:alert(1))",
      }),
    ).toThrow();
  });
});
describe("credentials and sessions", () => {
  it("bootstrap has no default credentials; hashes and revokes high entropy sessions", () => {
    expect(() => auth.bootstrap("owner@example.test", "short")).toThrow();
    auth.bootstrap("owner@example.test", "test-only-long-secret");
    expect(() =>
      auth.bootstrap("other@example.test", "another-long-secret"),
    ).toThrow("already exists");
    expect(() =>
      auth.login("owner@example.test", "incorrect", "auth-test"),
    ).toThrow("Invalid");
    const result = auth.login(
      "owner@example.test",
      "test-only-long-secret",
      "auth-test",
    );
    expect(result.token).toHaveLength(64);
    expect(auth.sessionFromToken(result.token)?.email).toBe(
      "owner@example.test",
    );
    const row = sqlite.prepare("SELECT token_hash FROM sessions").get() as {
      token_hash: string;
    };
    expect(row.token_hash).not.toBe(result.token);
    auth.logout(result.token);
    expect(auth.sessionFromToken(result.token)).toBeNull();
  });
  it("rate limits repeated attempts", () => {
    auth.limit("limit-test", 1, 10000);
    expect(() => auth.limit("limit-test", 1, 10000)).toThrow("try again");
  });
});
