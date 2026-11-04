import type { Metadata } from "next";
import type { MediaAsset, Seo, Settings } from "@/shared/content";
import { allowIndexing, siteUrl } from "@/shared/urls";
export function publicMetadata(
  title: string,
  description: string,
  seo: Seo,
  path: string,
  settings: Settings,
  media: MediaAsset[] = [],
): Metadata {
  const canonical = new URL(path, siteUrl()).toString();
  const image = media.find(
    (m) => m.id === (seo.ogImageId || settings.seo.ogImageId),
  );
  const favicon = media.find((m) => m.id === settings.faviconImageId);
  const index = allowIndexing() && !seo.noindex && !settings.seo.noindex;
  const resolvedTitle =
    seo.title ||
    (path === "/" ? settings.seo.title : undefined) ||
    title.trim() ||
    settings.seo.title ||
    settings.siteTitle;
  const resolvedDescription =
    seo.description ||
    settings.seo.description ||
    description ||
    settings.description;
  return {
    title: resolvedTitle,
    description: resolvedDescription,
    ...(favicon
      ? { icons: { icon: [{ url: favicon.url, type: "image/webp" }] } }
      : {}),
    alternates: { canonical },
    robots: { index, follow: index },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      siteName: settings.siteTitle,
      locale: "ru_RU",
      type: "website",
      ...(image
        ? {
            images: [
              {
                url: new URL(image.url, siteUrl()).toString(),
                width: image.width,
                height: image.height,
                alt: image.alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: resolvedTitle,
      description: resolvedDescription,
      ...(image ? { images: [new URL(image.url, siteUrl()).toString()] } : {}),
    },
  };
}
