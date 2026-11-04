"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { MediaAsset } from "@/shared/content";
import { api } from "./api";
import { Field, errorMessage } from "./fields";
export function MediaEditor() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
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
        Upload approved raster images with meaningful alternative text. Unsafe
        formats are rejected by the server.
      </p>
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
      <div className="media-grid">
        {assets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            refresh={load}
            onError={setError}
            onMessage={setMessage}
          />
        ))}
      </div>
      {!assets.length && <p>No media uploaded yet.</p>}
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
