import "server-only";
import {
  type PublishedHome,
  type PublicCard,
  type PublicPage,
} from "@/shared/content";
import {
  getSettings,
  getTheme,
  getMediaList,
  publishedEntities,
  publicNavigation,
  resolveRedirect,
} from "./store";
import { cardUrl, pageUrl } from "@/shared/urls";
export async function getPublishedCards() {
  return (publishedEntities("card") as PublicCard[]).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
}
export async function getPublishedPages() {
  return publishedEntities("page") as PublicPage[];
}
export async function getPublishedCardBySlug(slug: string) {
  return (await getPublishedCards()).find((c) => c.slug === slug) || null;
}
export async function getPublishedPageBySlug(slug: string) {
  return (await getPublishedPages()).find((p) => p.slug === slug) || null;
}
export async function getPublishedNavigation() {
  return publicNavigation();
}
export async function getPublishedTheme() {
  return getTheme().published;
}
export async function getSiteMetadata() {
  return getSettings().data;
}
export async function getMedia() {
  return getMediaList();
}
export async function getPublishedHome(): Promise<PublishedHome> {
  const page = await getPublishedPageBySlug("home");
  if (!page) throw new Error("Homepage not published; run npm run db:seed");
  return {
    page,
    cards: await getPublishedCards(),
    navigation: await getPublishedNavigation(),
    settings: await getSiteMetadata(),
    theme: await getPublishedTheme(),
    media: await getMedia(),
  };
}
export async function getRedirect(path: string) {
  const target = resolveRedirect(path);
  if (!target) return null;
  const paths = [
    ...(await getPublishedCards()).map((c) => cardUrl(c.slug)),
    ...(await getPublishedPages()).map((p) => pageUrl(p.slug)),
  ];
  return paths.includes(target) ? target : null;
}
