import { notFound } from "next/navigation";
import { getPublishedHome, getPublishedPageBySlug } from "@/server/public";
import { PublicContent, DetailContent } from "./PublicContent";
import { SiteShell } from "./SiteShell";
import { publicMetadata } from "./metadata";
import { pageUrl } from "@/shared/urls";
export async function publishedPageMetadata(slug: string) {
  const [page, home] = await Promise.all([
    getPublishedPageBySlug(slug),
    getPublishedHome(),
  ]);
  return page
    ? publicMetadata(
        page.title,
        page.body.slice(0, 180),
        page.seo,
        pageUrl(slug),
        home.settings,
        home.media,
      )
    : {};
}
export async function PublishedPage({ slug }: { slug: string }) {
  const [page, home] = await Promise.all([
    getPublishedPageBySlug(slug),
    getPublishedHome(),
  ]);
  if (!page) notFound();
  const hasHero = page.sections.some((b) => b.visible && b.type === "hero");
  return (
    <SiteShell {...home}>
      <main id="main">
        {!hasHero && (
          <DetailContent
            title={page.title}
            body={page.body}
            bodyRichText={page.bodyRichText}
            media={[]}
          />
        )}
        <PublicContent home={{ ...home, page }} />
      </main>
    </SiteShell>
  );
}
