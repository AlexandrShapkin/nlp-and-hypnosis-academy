import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicContent } from "./PublicContent";
import { SiteShell } from "./SiteShell";
import { publicMetadata } from "./metadata";
import {
  blockSchema,
  defaultTheme,
  pageSchema,
  settingsSchema,
  type PublishedHome,
} from "@/shared/content";
const settings = settingsSchema.parse({
  siteTitle: "Академия",
  brandLabel: "Академия",
  description: "Описание",
  phone: "",
  email: "",
  bookingLabel: "Вопрос",
  bookingUrl: "/#contact",
  footerText: "Связь",
  legalText: "Информация",
  privacyVersion: "1",
  socialUrl: "",
  seo: {},
});
const home: PublishedHome = {
  page: { ...pageSchema.parse({ slug: "home", title: "Главная" }), id: "home" },
  cards: [],
  settings,
  navigation: [],
  theme: defaultTheme,
  media: [],
};
afterEach(() => {
  delete process.env.SEO_ALLOW_INDEXING;
  delete process.env.SITE_URL;
});
describe("public SSR boundaries", () => {
  it("renders author text escaped and refuses script CTA destinations", () => {
    const section = blockSchema.parse({
      id: "hero",
      key: "hero",
      type: "hero",
      heading: "<script>alert(1)</script>",
      body: "Текст",
      data: { ctaLabel: "Открыть", ctaUrl: "javascript:alert(1)" },
    });
    const html = renderToStaticMarkup(
      <PublicContent
        home={{ ...home, page: { ...home.page, sections: [section] } }}
      />,
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<script>");
    expect(html).toContain("<h1>");
  });
  it("uses one H1 even when multiple hero blocks are authored", () => {
    const sections = ["hero", "second"].map((id) =>
      blockSchema.parse({ id, key: id, type: "hero", heading: id }),
    );
    const html = renderToStaticMarkup(
      <PublicContent home={{ ...home, page: { ...home.page, sections } }} />,
    );
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain("<h2>second</h2>");
  });
  it("keeps every generated navigation link reachable on mobile and desktop overflow", () => {
    const navigation = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      label: `Topic ${i}`,
      href: `/topics/topic-${i}`,
      group: "primary" as const,
      visible: true,
      order: i,
    }));
    const html = renderToStaticMarkup(
      <SiteShell
        settings={settings}
        theme={defaultTheme}
        navigation={navigation}
      >
        <main />
      </SiteShell>,
    );
    for (const item of navigation)
      expect(html.split(`href="${item.href}"`)).toHaveLength(3);
    expect(html).toContain("Мобильная навигация");
  });
  it("uses configured canonical origin and guards local indexability", () => {
    process.env.SITE_URL = "https://academy.example";
    const metadata = publicMetadata(
      "Тема",
      "Описание",
      { noindex: false },
      "/topics/topic",
      settings,
    );
    expect(metadata.alternates?.canonical).toBe(
      "https://academy.example/topics/topic",
    );
    expect(metadata.robots).toEqual({ index: false, follow: false });
    process.env.SEO_ALLOW_INDEXING = "true";
    expect(
      publicMetadata(
        "Тема",
        "Описание",
        { noindex: false },
        "/topics/topic",
        settings,
      ).robots,
    ).toEqual({ index: true, follow: true });
    expect(
      publicMetadata(
        "Тема",
        "Описание",
        { noindex: true },
        "/topics/topic",
        settings,
      ).robots,
    ).toEqual({ index: false, follow: false });
  });
  it("applies global SEO defaults without replacing specific page titles or overrides", () => {
    process.env.SITE_URL = "https://academy.example";
    process.env.SEO_ALLOW_INDEXING = "true";
    const global = {
      ...settings,
      seo: {
        title: "Global title",
        description: "Global description",
        noindex: true,
        ogImageId: "global-image",
      },
    };
    const media = [
      {
        id: "global-image",
        url: "/uploads/global.webp",
        alt: "Global image",
        caption: "",
        credit: "",
        width: 800,
        height: 600,
      },
      {
        id: "page-image",
        url: "/uploads/page.webp",
        alt: "Page image",
        caption: "",
        credit: "",
        width: 800,
        height: 600,
      },
    ];
    const defaults = publicMetadata(
      "Specific page",
      "Page summary",
      { noindex: false },
      "/topics/topic",
      global,
      media,
    );
    expect(defaults.title).toBe("Specific page");
    expect(
      publicMetadata("Homepage title", "", { noindex: false }, "/", global)
        .title,
    ).toBe("Global title");
    expect(defaults.description).toBe("Global description");
    expect(defaults.robots).toEqual({ index: false, follow: false });
    expect(defaults.openGraph).toMatchObject({
      images: [{ url: "https://academy.example/uploads/global.webp" }],
    });
    const overrides = publicMetadata(
      "Specific page",
      "Page summary",
      {
        title: "Page SEO title",
        description: "Page SEO description",
        noindex: false,
        ogImageId: "page-image",
      },
      "/topics/topic",
      global,
      media,
    );
    expect(overrides.title).toBe("Page SEO title");
    expect(overrides.description).toBe("Page SEO description");
    expect(overrides.openGraph).toMatchObject({
      images: [{ url: "https://academy.example/uploads/page.webp" }],
    });
    expect(publicMetadata(" ", "", { noindex: false }, "/", global).title).toBe(
      "Global title",
    );
  });
});
