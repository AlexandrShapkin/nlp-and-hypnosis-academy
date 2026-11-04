import type { MetadataRoute } from "next";
import {
  getPublishedCards,
  getPublishedPages,
  getSiteMetadata,
} from "@/server/public";
import { cardUrl, pageUrl, siteUrl } from "@/shared/urls";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if ((await getSiteMetadata()).seo.noindex) return [];
  const [cards, pages] = await Promise.all([
    getPublishedCards(),
    getPublishedPages(),
  ]);
  return [
    ...pages
      .filter((p) => !p.seo.noindex)
      .map((p) => ({
        url: new URL(pageUrl(p.slug), siteUrl()).toString(),
        ...(p.publishedAt ? { lastModified: p.publishedAt } : {}),
      })),
    ...cards
      .filter((c) => !c.seo.noindex)
      .map((c) => ({
        url: new URL(cardUrl(c.slug), siteUrl()).toString(),
        ...(c.publishedAt ? { lastModified: c.publishedAt } : {}),
      })),
  ];
}
