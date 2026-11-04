"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MediaAsset } from "@/shared/content";
import { api } from "./api";
import { Field, errorMessage } from "./fields";
export function MediaEditor() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const visibleAssets = assets.filter((asset) => (asset.alt + " " + asset.caption + " " + asset.credit).toLowerCase().includes(query.toLowerCase()));
  async function load() {
    const result = await api<MediaAsset[]>("media");
    setAssets(result.data);
  }
  useEffect(() => {
    void api<MediaAsset[]>("media")
      .then((r) => setAssets(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <>
      <h1>Media library</h1>
      <p className="intro">
        Upload approved photos and illustrations here, or directly from a page,
        card or logo editor. The same image can be reused across the site.
      </p>
      <div className="panel notice">
        <h2>How to use your images</h2>
        <p>1. Upload a JPEG, PNG or WebP image (up to 5 MB) and describe it in the alternative text field.</p>
        <p>2. Open <Link href="/admin/pages">Pages &amp; sections</Link> to select and order images for a section, or <Link href="/admin/cards">Cards</Link> for card photos.</p>
        <p>3. To update the website logo or browser icon, open <Link href="/admin/settings">Site settings</Link> and choose images under Brand images.</p>
        <p>4. Save and publish content changes. Site settings apply when you save them.</p>
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
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          setError("");
          try {
            await api("media", "POST", new FormData(form));
            form.reset();
            setMessage("Image uploaded.");
            await load();
          } catch (error) {
            setError(errorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid">
          <label>
            Image file
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <label>
            Alternative text
            <input name="alt" required maxLength={500} />
          </label>
          <label>
            Caption
            <input name="caption" maxLength={1000} />
          </label>
          <label>
            Credit / license
            <input name="credit" maxLength={1000} />
          </label>
        </div>
        <button disabled={busy}>{busy ? "Uploading…" : "Upload image"}</button>
      </form>
      <label>
        Search library ({assets.length} images)
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search image descriptions or credits" />
      </label>
      <div className="media-grid">
        {visibleAssets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            refresh={load}
            onError={setError}
            onMessage={setMessage}
          />
        ))}
      </div>
      {!assets.length && <p>No media uploaded yet. Use the form above to upload your first image.</p>}
      {assets.length > 0 && visibleAssets.length === 0 && <p>No images match that search.</p>}
    </>
  );
}
function MediaCard({
  asset,
  refresh,
  onError,
  onMessage,
}: {
  asset: MediaAsset;
  refresh: () => Promise<void>;
  onError: (s: string) => void;
  onMessage: (s: string) => void;
}) {
  const [draft, setDraft] = useState(asset);
  const [busy, setBusy] = useState(false);
  return (
    <article className="panel">
      <Image
        unoptimized
        src={asset.url}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
      />
      <p className="muted">
        <code>{asset.id}</code>
        <br />
        {asset.width} × {asset.height}
      </p>
      <Field
        label="Alternative text"
        value={draft.alt}
        onChange={(alt) => setDraft({ ...draft, alt })}
      />
      <Field
        label="Caption"
        value={draft.caption || ""}
        onChange={(caption) => setDraft({ ...draft, caption })}
      />
      <Field
        label="Credit"
        value={draft.credit || ""}
        onChange={(credit) => setDraft({ ...draft, credit })}
      />
      <div className="toolbar">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            onError("");
            try {
              await api(`media/${asset.id}`, "PATCH", {
                alt: draft.alt,
                caption: draft.caption,
                credit: draft.credit,
              });
              onMessage("Media details saved.");
              await refresh();
            } catch (error) {
              onError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          Save details
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            if (
              !confirm(
                "Delete this image? The server will reject deletion while it is referenced by content.",
              )
            )
              return;
            setBusy(true);
            onError("");
            try {
              await api(`media/${asset.id}`, "DELETE");
              onMessage("Media deleted.");
              await refresh();
            } catch (error) {
              onError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete image
        </button>
      </div>
    </article>
  );
}
