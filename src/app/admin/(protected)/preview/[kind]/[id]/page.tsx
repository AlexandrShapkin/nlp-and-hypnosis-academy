import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { getEntity } from "@/server/store";
import { getPublishedHome } from "@/server/public";
import { cardSchema, pageSchema } from "@/shared/content";
import {
  PublicContent,
  DetailContent,
} from "@/components/public/PublicContent";
import { SiteShell } from "@/components/public/SiteShell";
import "@/styles/public.css";
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  await requireAdmin();
  const { kind, id } = await params;
  if (kind !== "cards" && kind !== "pages") notFound();
  let entity;
  try {
    entity = getEntity(kind === "cards" ? "card" : "page", id);
  } catch {
    notFound();
  }
  const home = await getPublishedHome();
  if (kind === "cards") {
    const draft = cardSchema.parse(entity.draft);
    return (
      <>
        <aside className="cms-preview-banner" aria-label="Предпросмотр">
          Предпросмотр сохранённого черновика · виден только вам ·{" "}
          <Link href="/admin/cards">Вернуться в редактор</Link>
        </aside>
        <SiteShell
          settings={home.settings}
          navigation={home.navigation}
          theme={home.theme}
          media={home.media}
        >
          <main id="main">
            <DetailContent
              title={draft.title}
              summary={draft.summary}
              body={draft.body}
              bodyRichText={draft.bodyRichText}
              media={draft.mediaIds.flatMap((id) =>
                home.media.filter((m) => m.id === id),
              )}
            />
          </main>
        </SiteShell>
      </>
    );
  }
  const draft = pageSchema.parse(entity.draft);
  const hasHero = draft.sections.some(
    (section) => section.visible && section.type === "hero",
  );
  return (
    <>
      <aside className="cms-preview-banner" aria-label="Предпросмотр">
        Предпросмотр сохранённого черновика · виден только вам ·{" "}
        <Link href="/admin/pages">Вернуться в редактор</Link>
      </aside>
      <SiteShell
        settings={home.settings}
        navigation={home.navigation}
        theme={home.theme}
        media={home.media}
      >
        <main id="main">
          {!hasHero &&
            (draft.slug === "home" ? (
              <div className="public-container public-detail">
                <h1>{draft.title}</h1>
              </div>
            ) : (
              <DetailContent
                title={draft.title}
                body={draft.body}
                bodyRichText={draft.bodyRichText}
                media={[]}
              />
            ))}
          <PublicContent
            home={{ ...home, page: { ...draft, id: entity.id } }}
          />
        </main>
      </SiteShell>
    </>
  );
}
