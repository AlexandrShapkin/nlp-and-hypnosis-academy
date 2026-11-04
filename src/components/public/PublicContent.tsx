import Image from "next/image";
import Link from "next/link";
import type {
  Block,
  MediaAsset,
  PublicCard,
  PublishedHome,
} from "@/shared/content";
import { cardUrl } from "@/shared/urls";
import { safeUrlSchema } from "@/shared/content";
import { ContactForm } from "./ContactForm";
function text(block: Block, key: string) {
  return typeof block.data[key] === "string" ? String(block.data[key]) : "";
}
function Picture({
  asset,
  priority = false,
}: {
  asset: MediaAsset | undefined;
  priority?: boolean;
}) {
  return asset ? (
    <figure className="public-picture">
      <Image
        src={asset.url}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        priority={priority}
        unoptimized
        sizes="(max-width: 760px) 100vw, 50vw"
      />
      {asset.caption && <figcaption>{asset.caption}</figcaption>}
    </figure>
  ) : (
    <div className="public-art" aria-hidden="true">
      <div className="public-art-orbit" />
      <div className="public-art-arch" />
      <div className="public-art-sun" />
      <div className="public-art-leaf" />
    </div>
  );
}
function Card({
  card,
  media,
  index,
}: {
  card: PublicCard;
  media: MediaAsset[];
  index: number;
}) {
  const image = media.find((m) => card.mediaIds.includes(m.id));
  return (
    <article className={`public-card public-variant-${card.variant}`}>
      {image && <Picture asset={image} />}
      <div className="public-card-top">
        <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span aria-hidden="true">↗</span>
      </div>
      <h3>
        <a href={cardUrl(card.slug)}>{card.title}</a>
      </h3>
      {card.summary && <p>{card.summary}</p>}
    </article>
  );
}
export function PublicContent({ home }: { home: PublishedHome }) {
  const firstHeroId = home.page.sections.find(
    (b) => b.visible && b.type === "hero",
  )?.id;
  return (
    <>
      {home.page.sections
        .filter((b) => b.visible && b.type !== "footer")
        .map((block) => {
          const assigned = home.cards.filter(
            (c) => c.sectionId === block.id || c.sectionId === block.key,
          );
          const type =
            block.type === "metrics"
              ? "metric"
              : block.type === "service_list"
                ? "service"
                : block.type === "testimonials"
                  ? "testimonial"
                  : block.type === "about"
                    ? "credential"
                    : block.type === "faq"
                      ? "faq"
                      : block.type === "card_grid"
                        ? "area"
                        : null;
          const cards = assigned.length
            ? assigned
            : home.cards.filter((c) => c.type === type && !c.sectionId);
          const asset = home.media.find((m) => m.id === block.imageId);
          const ctaLabel = text(block, "ctaLabel");
          const candidateUrl = text(block, "ctaUrl");
          const ctaUrl = safeUrlSchema.safeParse(candidateUrl).success
            ? candidateUrl
            : "";
          const h1 = block.id === firstHeroId;
          if (block.type === "hero")
            return (
              <section
                key={block.id}
                id={block.key}
                className={`public-section public-hero public-variant-${block.variant}`}
              >
                <div className="public-container public-hero-grid">
                  <div className="public-hero-copy">
                    {block.eyebrow && (
                      <p className="public-eyebrow">
                        <span />
                        {block.eyebrow}
                      </p>
                    )}
                    {h1 ? <h1>{block.heading}</h1> : <h2>{block.heading}</h2>}
                    <p className="public-lead">{block.body}</p>
                    {ctaLabel && ctaUrl && (
                      <a className="public-button" href={ctaUrl}>
                        {ctaLabel}
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                  <Picture asset={asset} priority />
                </div>
              </section>
            );
          return (
            <section
              key={block.id}
              id={block.key}
              className={`public-section public-block-${block.type} public-variant-${block.variant}`}
            >
              <div className="public-container">
                {block.eyebrow && (
                  <p className="public-eyebrow">{block.eyebrow}</p>
                )}
                <div className="public-section-heading">
                  <h2>{block.heading}</h2>
                  {block.body && <p className="public-body">{block.body}</p>}
                </div>
                {block.type === "contact_form" ? (
                  <div className="public-contact-grid">
                    <div className="public-contact-aside">
                      <span
                        className="public-contact-symbol"
                        aria-hidden="true"
                      >
                        ✳
                      </span>
                      {text(block, "description") && (
                        <p>{text(block, "description")}</p>
                      )}
                      {home.settings.phone && (
                        <a
                          href={`tel:${home.settings.phone.replace(/[^+\d]/g, "")}`}
                        >
                          {home.settings.phone}
                        </a>
                      )}
                      {home.settings.email && (
                        <a href={`mailto:${home.settings.email}`}>
                          {home.settings.email}
                        </a>
                      )}
                    </div>
                    <ContactForm
                      block={block}
                      privacyVersion={home.settings.privacyVersion}
                    />
                  </div>
                ) : block.type === "about" ? (
                  <div className="public-about-grid">
                    <Picture asset={asset} />
                    <div className="public-credentials">
                      {cards.map((c, i) => (
                        <article key={c.id}>
                          <span aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3>
                              <a href={cardUrl(c.slug)}>{c.title}</a>
                            </h3>
                            <p>{c.summary}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : block.type === "metrics" ? (
                  <div className="public-metrics">
                    {cards.map((c) => (
                      <article key={c.id}>
                        <h3>{c.title}</h3>
                        <p>{c.summary}</p>
                      </article>
                    ))}
                  </div>
                ) : block.type === "faq" ? (
                  <div className="public-faq">
                    {cards.map((c) => (
                      <details key={c.id}>
                        <summary>{c.title}</summary>
                        <p>{c.body || c.summary}</p>
                      </details>
                    ))}
                  </div>
                ) : block.type === "media_gallery" ? (
                  <div className="public-card-grid">
                    {home.media
                      .filter(
                        (m) =>
                          Array.isArray(block.data.mediaIds) &&
                          block.data.mediaIds.includes(m.id),
                      )
                      .map((m) => (
                        <Picture key={m.id} asset={m} />
                      ))}
                  </div>
                ) : (
                  <div className="public-card-grid">
                    {cards.map((card, index) => (
                      <Card
                        card={card}
                        media={home.media}
                        index={index}
                        key={card.id}
                      />
                    ))}
                  </div>
                )}
                {!cards.length && text(block, "emptyMessage") && (
                  <p className="public-empty">{text(block, "emptyMessage")}</p>
                )}
                {ctaLabel && ctaUrl && (
                  <a className="public-text-link" href={ctaUrl}>
                    {ctaLabel} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </section>
          );
        })}
    </>
  );
}
export function DetailContent({
  title,
  summary,
  body,
  media,
}: {
  title: string;
  summary?: string;
  body: string;
  media: MediaAsset[];
}) {
  return (
    <article className="public-container public-detail">
      <Link className="public-text-link" href="/">
        ← На главную
      </Link>
      <h1>{title}</h1>
      {summary && <p className="public-lead">{summary}</p>}
      <div className="public-prose">
        {body
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </div>
      {media.map((m) => (
        <Picture key={m.id} asset={m} />
      ))}
    </article>
  );
}
