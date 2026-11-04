import { getPublishedHome } from "@/server/public";
import { PublicContent } from "@/components/public/PublicContent";
import { SiteShell } from "@/components/public/SiteShell";
import { publicMetadata } from "@/components/public/metadata";
import { siteUrl } from "@/shared/urls";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const home = await getPublishedHome();
  return publicMetadata(
    home.page.title,
    home.settings.description,
    home.page.seo,
    "/",
    home.settings,
    home.media,
  );
}
export default async function HomePage() {
  const home = await getPublishedHome();
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: home.settings.siteTitle,
    url: siteUrl(),
    inLanguage: "ru-RU",
  };
  return (
    <SiteShell {...home}>
      <main id="main">
        {!home.page.sections.some((b) => b.visible && b.type === "hero") && (
          <div className="public-container public-detail">
            <h1>{home.page.title}</h1>
          </div>
        )}
        <PublicContent home={home} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </SiteShell>
  );
}
