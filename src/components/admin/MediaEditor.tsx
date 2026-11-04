"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@/shared/content";
import { useUnsavedChanges } from "./useUnsavedChanges";
import { api } from "./api";
import { Field, errorMessage } from "./fields";
export function MediaEditor() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  useUnsavedChanges(dirtyIds.size > 0);
  const onDirty = useCallback(
    (id: string, dirty: boolean) =>
      setDirtyIds((previous) => {
        const next = new Set(previous);
        if (dirty) next.add(id);
        else next.delete(id);
        return next;
      }),
    [],
  );
  const visibleAssets = assets.filter((asset) =>
    (asset.alt + " " + asset.caption + " " + asset.credit)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
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
      <h1>Фотографии и файлы</h1>
      <p className="intro">
        Загружайте фотографии и используйте их в любых разделах сайта. Найти и
        выбрать изображение можно прямо во время редактирования.
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
            const original = new FormData(form);
            const files = original
              .getAll("file")
              .filter(
                (file): file is File => file instanceof File && file.size > 0,
              );
            for (const [index, file] of files.entries()) {
              const payload = new FormData();
              payload.set("file", file);
              payload.set(
                "alt",
                `${String(original.get("alt") || "").slice(0, 480)}${files.length > 1 ? ` — ${index + 1}` : ""}`,
              );
              payload.set("caption", String(original.get("caption") || ""));
              payload.set("credit", String(original.get("credit") || ""));
              await api("media", "POST", payload);
            }
            form.reset();
            setMessage(`Загружено фотографий: ${files.length}.`);
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
            Файл изображения
            <input
              type="file"
              name="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <label>
            Описание изображения
            <input name="alt" required maxLength={500} />
          </label>
          <label>
            Подпись под изображением
            <input name="caption" maxLength={1000} />
          </label>
          <label>
            Автор и права на изображение
            <input name="credit" maxLength={1000} />
          </label>
        </div>
        <button disabled={busy}>
          {busy ? "Загружаем…" : "Загрузить изображение"}
        </button>
      </form>
      <label>
        Найти фотографию (всего: {assets.length})
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по описанию, подписи или автору"
        />
      </label>
      <div className="media-grid">
        {visibleAssets.map((asset) => (
          <MediaCard
            key={asset.id}
            asset={asset}
            refresh={load}
            onError={setError}
            onMessage={setMessage}
            onDirty={onDirty}
          />
        ))}
      </div>
      {!assets.length && (
        <p>Фотографий пока нет. Загрузите первую с помощью формы выше.</p>
      )}
      {assets.length > 0 && visibleAssets.length === 0 && (
        <p>По вашему запросу ничего не найдено.</p>
      )}
    </>
  );
}
function MediaCard({
  asset,
  refresh,
  onError,
  onMessage,
  onDirty,
}: {
  asset: MediaAsset;
  refresh: () => Promise<void>;
  onError: (s: string) => void;
  onMessage: (s: string) => void;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(asset);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(asset);
  useEffect(() => {
    onDirty(asset.id, dirty);
  }, [asset.id, dirty, onDirty]);
  return (
    <article className="panel">
      <a
        href={asset.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Увеличить: ${asset.alt}`}
      >
        <Image
          unoptimized
          src={asset.url}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
        />
      </a>
      <p className="muted">
        WebP · {asset.width} × {asset.height} пикселей
      </p>
      <Field
        label="Описание изображения"
        value={draft.alt}
        onChange={(alt) => setDraft({ ...draft, alt })}
      />
      <Field
        label="Подпись под изображением"
        value={draft.caption || ""}
        onChange={(caption) => setDraft({ ...draft, caption })}
      />
      <Field
        label="Автор"
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
              onMessage("Описание фотографии сохранено.");
              await refresh();
            } catch (error) {
              onError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Сохраняем…" : "Сохранить описание"}
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            if (
              !confirm(
                "Удалить изображение из библиотеки? Если оно используется на сайте или в черновике, удалить его не получится.",
              )
            )
              return;
            setBusy(true);
            onError("");
            try {
              await api(`media/${asset.id}`, "DELETE");
              onMessage("Изображение удалено.");
              await refresh();
            } catch (error) {
              onError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          Удалить изображение
        </button>
      </div>
    </article>
  );
}
