import { describe, it, expect } from "vitest";
import {
  cardSchema,
  pageSchema,
  themeSchema,
  defaultTheme,
  settingsSchema,
  safeUrlSchema,
} from "../src/shared/content";
import { cardUrl, pageUrl } from "../src/shared/urls";
describe("v1 contracts", () => {
  it("new cards default to canonical navigation and safely escaped plain text", () => {
    const c = cardSchema.parse({ slug: "new-topic", title: "Новая тема" });
    expect(c.showInNavigation).toBe(true);
    expect(cardUrl(c.slug)).toBe("/topics/new-topic");
    expect(c.seo.noindex).toBe(false);
  });
  it("rejects unsafe routes and malformed slugs", () => {
    for (const slug of ["../escape", "Two words", "<script>"])
      expect(cardSchema.safeParse({ slug, title: "title" }).success).toBe(
        false,
      );
    for (const u of [
      "javascript:alert(1)",
      "//evil.test",
      "data:text/html,x",
      "https://",
      "/\\evil.test",
      "/bad\npath",
    ])
      expect(safeUrlSchema.safeParse(u).success).toBe(false);
  });
  it("bounds tokens and excludes CSS injection", () => {
    expect(themeSchema.safeParse(defaultTheme).success).toBe(true);
    expect(
      themeSchema.safeParse({
        ...defaultTheme,
        primary: "red; background:url(x)",
      }).success,
    ).toBe(false);
    expect(
      themeSchema.safeParse({ ...defaultTheme, sectionSpacing: 9000 }).success,
    ).toBe(false);
  });
  it("requires a nonblank consent policy version", () => {
    expect(settingsSchema.shape.privacyVersion.safeParse("").success).toBe(
      false,
    );
    expect(settingsSchema.shape.privacyVersion.safeParse("  ").success).toBe(
      false,
    );
    expect(settingsSchema.shape.privacyVersion.parse("2")).toBe("2");
  });
  it("centralizes legal and custom paths", () => {
    expect(pageUrl("privacy")).toBe("/privacy");
    expect(pageUrl("home")).toBe("/");
    expect(pageUrl("workshops")).toBe("/pages/workshops");
    expect(
      pageSchema.parse({ slug: "workshops", title: "Семинары" }).sections,
    ).toEqual([]);
  });
});
