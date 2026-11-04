"use client";
import { useCallback, useEffect, useState } from "react";
import {
  blockTypes,
  cardTypes,
  cardSchema,
  pageSchema,
  type Block,
  type CardDraft,
  type PageDraft,
  type Entity,
  type MediaAsset,
} from "@/shared/content";
import { api } from "./api";
import { Field, Select, SeoFields, errorMessage, slugify } from "./fields";
import { MediaPicker } from "./MediaPicker";
type Draft = CardDraft | PageDraft;
const emptyCard = () => ({
  ...cardSchema.parse({ title: "New card", slug: "new-card" }),
  title: "",
});
const emptyPage = () => ({
  ...pageSchema.parse({ title: "New page", slug: "new-page" }),
  title: "",
});
export function ContentEditor({ kind }: { kind: "cards" | "pages" }) {
  const [entities, setEntities] = useState<Entity<Draft>[]>([]);
  const [selected, setSelected] = useState<Entity<Draft> | null>(null);
  const [draft, setDraft] = useState<Draft>(
    kind === "cards" ? emptyCard() : emptyPage(),
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [filter, setFilter] = useState("");
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [homeSections, setHomeSections] = useState<Block[]>([]);
  const onUploaded = (asset: MediaAsset) => setMedia((items) => [...items, asset]);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const load = useCallback(async () => {
    const result = await api<Entity<Draft>[]>(kind);
    setEntities(result.data);
  }, [kind]);
  useEffect(() => {
    void api<Entity<Draft>[]>(kind)
      .then((r) => setEntities(r.data))
      .catch((e) => setError(errorMessage(e)));
    void api<MediaAsset[]>("media")
      .then((r) => setMedia(r.data))
      .catch(() => {});
    if (kind === "cards") {
      void api<Entity<PageDraft>[]>("pages")
        .then((r) => setHomeSections(r.data.find((e) => e.draft.slug === "home")?.draft.sections || []))
        .catch(() => {});
    }
  }, [kind]);
  function edit(entity: Entity<Draft> | null) {
    if (dirty && !confirm("Discard unsaved edits?")) return;
    setSelected(entity);
    setDraft(
      entity ? entity.draft : kind === "cards" ? emptyCard() : emptyPage(),
    );
    setDirty(false);
    setSlugTouched(false);
    setError("");
    setMessage("");
    setPreview(false);
  }
  function update(patch: Partial<CardDraft & PageDraft>) {
    setDraft({ ...draft, ...patch });
    setDirty(true);
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const parsed =
        kind === "cards" ? cardSchema.parse(draft) : pageSchema.parse(draft);
      const result = await api<Entity<Draft>>(
        selected ? `${kind}/${selected.id}` : kind,
        selected ? "PATCH" : "POST",
        { ...parsed, ...(selected ? { version: selected.version } : {}) },
      );
      setSelected(result.data);
      setDraft(result.data.draft);
      setDirty(false);
      setMessage("Draft saved. Public content is unchanged.");
      await load();
      return result.data;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function publish(action: "publish" | "unpublish") {
    if (dirty) {
      setError("Save the draft before publishing.");
      return;
    }
    if (!selected) {
      setError("Save a draft first.");
      return;
    }
    if (
      !confirm(
        action === "publish"
          ? "Publish this saved draft to the public site?"
          : "Unpublish this content and remove its public navigation link?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Entity<Draft>>(
        `${kind}/${selected.id}/${action}`,
        "POST",
        { version: selected.version },
      );
      setSelected(result.data);
      setDraft(result.data.draft);
      setMessage(
        action === "publish"
          ? "Published successfully."
          : "Content unpublished.",
      );
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const isCard = "type" in draft;
  return (
    <>
      <h1>
        {kind === "cards" ? "Cards & reusable content" : "Pages & sections"}
      </h1>
      <p className="intro">
        Save a private draft, preview it, then explicitly publish. New cards
        join navigation by default.
      </p>
      <div className="editor-layout">
        <aside className="panel">
          <button onClick={() => edit(null)}>
            New {kind === "cards" ? "card" : "page"}
          </button>
          <label style={{ marginTop: 15 }}>
            Find content
            <input value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          {entities
            .filter((e) =>
              e.draft.title.toLowerCase().includes(filter.toLowerCase()),
            )
            .map((entity) => (
              <button
                key={entity.id}
                className={`entity-button ${selected?.id === entity.id ? "active" : ""}`}
                onClick={() => edit(entity)}
              >
                {entity.draft.title}
                <br />
                <span className={`badge ${entity.state}`}>{entity.state}</span>
              </button>
            ))}
        </aside>
        <section className="panel">
          <div className="toolbar">
            <h2>{selected ? "Edit content" : "Create draft"}</h2>
            {selected && (
              <span className={`badge ${selected.state}`}>
                {selected.state} · revision {selected.version}
              </span>
            )}
            {dirty && <span className="badge">Unsaved changes</span>}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid">
              <Field
                label="Title"
                value={draft.title}
                onChange={(title) =>
                  update({
                    title,
                    ...(!selected && !slugTouched
                      ? { slug: slugify(title) }
                      : {}),
                  })
                }
              />
              <Field
                label="Slug"
                value={draft.slug}
                onChange={(slug) => {
                  setSlugTouched(true);
                  update({ slug });
                }}
                hint={
                  isCard
                    ? `/topics/${draft.slug}`
                    : draft.slug === "home"
                      ? "/"
                      : `/pages/${draft.slug}`
                }
              />
            </div>
            {isCard && (
              <div className="grid">
                <Select
                  label="Card type"
                  value={draft.type}
                  options={cardTypes}
                  onChange={(type) =>
                    update({ type: type as CardDraft["type"] })
                  }
                />
                <Select
                  label="Card appearance"
                  value={draft.variant}
                  options={["default", "soft", "contrast"]}
                  onChange={(variant) =>
                    update({ variant: variant as CardDraft["variant"] })
                  }
                />
              </div>
            )}
            {isCard && (
              <div style={{ marginBottom: 15 }}>
                <label htmlFor="card-display-order">Display order</label>
                <input
                  id="card-display-order"
                  aria-describedby="card-display-order-hint"
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  value={draft.order ?? 0}
                  onChange={(e) => update({ order: Number(e.target.value) })}
                />
                <span id="card-display-order-hint" className="muted">
                  Lower numbers appear first. Save and publish to apply the
                  order.
                </span>
              </div>
            )}
            {isCard && (
              <Field
                label="Summary"
                value={draft.summary}
                onChange={(summary) => update({ summary })}
                multiline
              />
            )}
            <Field
              label="Body text"
              value={draft.body}
              onChange={(body) => update({ body })}
              multiline
              hint="Plain text is rendered safely. Separate paragraphs with blank lines."
            />
            {isCard && (
              <>
                <div className="grid">
                  <label>
                    Place card in section
                    <select
                      value={draft.sectionId || ""}
                      onChange={(e) => update({ sectionId: e.target.value || undefined })}
                    >
                      <option value="">Automatic: choose by card type</option>
                      {homeSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.heading || section.type} ({section.type})
                        </option>
                      ))}
                      {draft.sectionId && !homeSections.some((section) => section.id === draft.sectionId) && (
                        <option value={draft.sectionId}>Existing section: {draft.sectionId}</option>
                      )}
                    </select>
                    <span className="muted">Choose where this card appears on the homepage. New sections are managed in Pages & sections.</span>
                  </label>
                  <Field
                    label="Navigation anchor (optional)"
                    value={draft.anchor || ""}
                    onChange={(anchor) =>
                      update({ anchor: anchor || undefined })
                    }
                    hint="Existing visible homepage section key; leave blank for standalone topic page."
                  />
                </div>
                <MediaPicker
                  label="Card images"
                  value={draft.mediaIds}
                  media={media}
                  multiple
                  onChange={(mediaIds) => update({ mediaIds })}
                  onUploaded={onUploaded}
                  hint="The first image is used as the card thumbnail; all images appear in order on its detail page."
                />
              </>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={draft.showInNavigation}
                onChange={(e) => update({ showInNavigation: e.target.checked })}
              />
              Add to main navigation
            </label>
            <div className="grid">
              <Field
                label="Navigation label"
                value={draft.navigationLabel || ""}
                onChange={(navigationLabel) => update({ navigationLabel })}
              />
              <Select
                label="Navigation group"
                value={draft.navigationGroup}
                options={["primary", "footer"]}
                onChange={(navigationGroup) =>
                  update({
                    navigationGroup: navigationGroup as "primary" | "footer",
                  })
                }
              />
            </div>
            <SeoFields seo={draft.seo} onChange={(seo) => update({ seo })} media={media} onUploaded={onUploaded} />
            {!isCard && (
              <Sections
                sections={draft.sections}
                media={media}
                onUploaded={onUploaded}
                onChange={(sections) => update({ sections })}
              />
            )}
            <div className="toolbar">
              <button disabled={busy}>
                {busy ? "Working…" : "Save draft"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setPreview(!preview)}
              >
                {preview ? "Close preview" : "Preview draft"}
              </button>
              {selected && (
                <a
                  className="button secondary"
                  href={`/admin/preview/${kind}/${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview saved draft on site
                </a>
              )}
              <button
                type="button"
                disabled={busy || dirty || !selected}
                onClick={() => void publish("publish")}
              >
                Publish
              </button>
              {selected?.published && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || dirty}
                  onClick={() => void publish("unpublish")}
                >
                  Unpublish
                </button>
              )}
            </div>
          </form>
          {preview && (
            <div className="preview" aria-label="Private draft preview">
              <span className="badge">Private draft · noindex</span>
              <h1>{draft.title}</h1>
              {isCard && <p>{draft.summary}</p>}
              <p>{draft.body}</p>
              {!isCard &&
                draft.sections
                  .filter((s) => s.visible)
                  .map((section) => (
                    <section key={section.id}>
                      <h2>{section.heading}</h2>
                      <p>{section.body}</p>
                    </section>
                  ))}
            </div>
          )}
          {selected && (
            <div className="toolbar">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setDraft({
                    ...draft,
                    title: `${draft.title} (copy)`,
                    slug: `${draft.slug}-copy`,
                  });
                  setDirty(true);
                }}
              >
                Duplicate as new draft
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(
                      "Archive this content? Its public route and navigation will be removed.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    await api(`${kind}/${selected.id}`, "DELETE", {
                      version: selected.version,
                    });
                    setSelected(null);
                    setDraft(kind === "cards" ? emptyCard() : emptyPage());
                    setDirty(false);
                    setMessage("Content archived.");
                    await load();
                  } catch (e) {
                    setError(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Archive
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function Sections({
  sections,
  media,
  onUploaded,
  onChange,
}: {
  sections: Block[];
  media: MediaAsset[];
  onUploaded: (asset: MediaAsset) => void;
  onChange: (v: Block[]) => void;
}) {
  function update(index: number, patch: Partial<Block>) {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function move(index: number, offset: number) {
    const list = [...sections];
    [list[index], list[index + offset]] = [list[index + offset], list[index]];
    onChange(list);
  }
  return (
    <div>
      <h2>Page sections</h2>
      <p className="muted">
        Order controls the published section sequence. Hidden sections and their
        anchors are excluded.
      </p>
      {sections.map((section, index) => (
        <details className="section-box" key={section.id}>
          <summary>
            {index + 1}. {section.heading || section.type}{" "}
            {!section.visible && " · hidden"}
          </summary>
          <p className="muted">
            Section ID: <code>{section.id}</code>
          </p>
          <div className="grid">
            <Select
              label="Block type"
              value={section.type}
              options={blockTypes}
              onChange={(type) =>
                update(index, { type: type as Block["type"] })
              }
            />
            <Field
              label="Anchor key"
              value={section.key}
              onChange={(key) => update(index, { key })}
            />
          </div>
          <Field
            label="Section heading"
            value={section.heading}
            onChange={(heading) => update(index, { heading })}
          />
          <Field
            label="Section body"
            value={section.body}
            multiline
            onChange={(body) => update(index, { body })}
          />
          <Field
            label="Eyebrow"
            value={section.eyebrow || ""}
            onChange={(eyebrow) => update(index, { eyebrow })}
          />
          <div className="grid">
            <div>
              <MediaPicker
                label="Featured section image"
                value={section.imageId ? [section.imageId] : []}
                media={media}
                onUploaded={onUploaded}
                onChange={(ids) => update(index, { imageId: ids[0] })}
                hint="Main image for hero and about sections. Optional elsewhere."
              />
            </div>
            <Select
              label="Section appearance"
              value={section.variant}
              options={["default", "soft", "contrast"]}
              onChange={(variant) =>
                update(index, { variant: variant as Block["variant"] })
              }
            />
          </div>
          <MediaPicker
            label={section.type === "media_gallery" ? "Gallery images" : "Additional section images"}
            value={Array.isArray(section.data.mediaIds) ? section.data.mediaIds : []}
            media={media}
            multiple
            onUploaded={onUploaded}
            onChange={(mediaIds) => update(index, { data: { ...section.data, mediaIds } })}
            hint="Select any number of images. Use arrows to change the display order. Save the page draft, preview, then publish."
          />
          <SectionData
            data={section.data}
            onChange={(data) => update(index, { data })}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={section.visible}
              onChange={(e) => update(index, { visible: e.target.checked })}
            />
            Visible on published page
          </label>
          <div className="toolbar">
            <button
              type="button"
              className="secondary"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move up
            </button>
            <button
              type="button"
              className="secondary"
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
            >
              Move down
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (confirm("Remove this section from the draft?"))
                  onChange(sections.filter((_, i) => i !== index));
              }}
            >
              Remove section
            </button>
          </div>
        </details>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          onChange([
            ...sections,
            {
              id: crypto.randomUUID(),
              key: `section-${sections.length + 1}`,
              type: "rich_text",
              heading: "",
              body: "",
              visible: true,
              variant: "default",
              data: {},
            },
          ])
        }
      >
        Add section
      </button>
    </div>
  );
}
function SectionData({
  data,
  onChange,
}: {
  data: Block["data"];
  onChange: (v: Block["data"]) => void;
}) {
  const [key, setKey] = useState("");
  return (
    <details>
      <summary>Block labels, links & additional fields</summary>
      {Object.entries(data).filter(([name]) => name !== "mediaIds").map(([name, value]) => (
        <label key={name}>
          {name}
          {typeof value === "boolean" ? (
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange({ ...data, [name]: e.target.checked })}
            />
          ) : (
            <input
              value={Array.isArray(value) ? value.join("\n") : String(value)}
              onChange={(e) =>
                onChange({
                  ...data,
                  [name]: Array.isArray(value)
                    ? e.target.value.split("\n")
                    : typeof value === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const next = { ...data };
              delete next[name];
              onChange(next);
            }}
          >
            Remove field
          </button>
        </label>
      ))}
      <div className="toolbar">
        <input
          aria-label="Additional block field key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. submitLabel"
        />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (key.trim()) {
              onChange({ ...data, [key.trim()]: "" });
              setKey("");
            }
          }}
        >
          Add field
        </button>
      </div>
    </details>
  );
}
