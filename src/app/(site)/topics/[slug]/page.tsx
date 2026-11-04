import { notFound } from "next/navigation";
import { getPublishedCardBySlug, getPublishedHome } from "@/server/public";
import { DetailContent } from "@/components/public/PublicContent";
import { SiteShell } from "@/components/public/SiteShell";
import { publicMetadata } from "@/components/public/metadata";
import { cardUrl } from "@/shared/urls";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [card, home] = await Promise.all([
    getPublishedCardBySlug(slug),
    getPublishedHome(),
  ]);
  if (!card) return {};
  return publicMetadata(
    card.title,
    card.summary,
    card.seo,
    cardUrl(slug),
    home.settings,
    home.media,
  );
}
export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const [card, home] = await Promise.all([
    getPublishedCardBySlug(slug),
    getPublishedHome(),
  ]);
  if (!card) notFound();
  return (
    <SiteShell {...home}>
      <main id="main">
        <DetailContent
          title={card.title}
          summary={card.summary}
          body={card.body}
          media={home.media.filter((m) => card.mediaIds.includes(m.id))}
        />
      </main>
    </SiteShell>
  );
}
