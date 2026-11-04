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
        <div className="notice">
          Private saved draft preview · noindex ·{" "}
          <Link href="/admin/cards">Back to editor</Link>
        </div>
        <SiteShell
          settings={home.settings}
          navigation={home.navigation}
          theme={home.theme}
        >
          <DetailContent
            title={draft.title}
            summary={draft.summary}
            body={draft.body}
            media={home.media.filter((m) => draft.mediaIds.includes(m.id))}
          />
        </SiteShell>
      </>
    );
  }
  const draft = pageSchema.parse(entity.draft);
  return (
    <>
      <div className="notice">
        Private saved draft preview · noindex ·{" "}
        <Link href="/admin/pages">Back to editor</Link>
      </div>
      <SiteShell
        settings={home.settings}
        navigation={home.navigation}
        theme={home.theme}
      >
        {draft.sections.length ? (
          <PublicContent
            home={{ ...home, page: { ...draft, id: entity.id } }}
          />
        ) : (
          <DetailContent title={draft.title} body={draft.body} media={[]} />
        )}
      </SiteShell>
    </>
  );
}
