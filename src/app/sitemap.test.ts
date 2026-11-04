import { afterEach, describe, expect, it, vi } from "vitest";
import { cardSchema, pageSchema } from "@/shared/content";

const sources = vi.hoisted(() => ({
  cards: vi.fn(),
  pages: vi.fn(),
  settings: vi.fn(),
}));
vi.mock("@/server/public", () => ({
  getPublishedCards: sources.cards,
  getPublishedPages: sources.pages,
  getSiteMetadata: sources.settings,
}));
import sitemap from "./sitemap";

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("sitemap publication dates", () => {
  it("uses actual publication dates and omits unknown legacy dates", async () => {
    vi.stubEnv("SITE_URL", "https://academy.example");
    sources.settings.mockResolvedValue({ seo: { noindex: false } });
    const publishedAt = "2026-11-04T10:30:00.000Z";
    sources.pages.mockResolvedValue([
      {
        ...pageSchema.parse({ slug: "home", title: "Главная" }),
        id: "home",
        publishedAt,
      },
      { ...pageSchema.parse({ slug: "legacy", title: "Архив" }), id: "legacy" },
    ]);
    sources.cards.mockResolvedValue([
      {
        ...cardSchema.parse({ slug: "topic", title: "Тема" }),
        id: "topic",
        publishedAt,
      },
      {
        ...cardSchema.parse({
          slug: "private",
          title: "Закрытая тема",
          seo: { noindex: true },
        }),
        id: "private",
        publishedAt,
      },
    ]);
    expect(await sitemap()).toEqual([
      { url: "https://academy.example/", lastModified: publishedAt },
      { url: "https://academy.example/pages/legacy" },
      {
        url: "https://academy.example/topics/topic",
        lastModified: publishedAt,
      },
    ]);
  });
  it("omits all URLs when global SEO disables indexing", async () => {
    sources.settings.mockResolvedValue({ seo: { noindex: true } });
    expect(await sitemap()).toEqual([]);
    expect(sources.cards).not.toHaveBeenCalled();
    expect(sources.pages).not.toHaveBeenCalled();
  });
});
