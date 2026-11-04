"use client";
import { useId } from "react";
import type { Seo, MediaAsset } from "@/shared/content";
import { MediaPicker } from "./MediaPicker";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div style={{ marginBottom: 15 }}>
      <label htmlFor={id} style={{ marginBottom: 5 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          aria-describedby={hint ? hintId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          aria-describedby={hint ? hintId : undefined}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && (
        <span id={hintId} className="muted">
          {hint}
        </span>
      )}
    </div>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );
}
export function SeoFields({
  seo,
  onChange,
  media,
  onUploaded,
}: {
  seo: Seo;
  onChange: (v: Seo) => void;
  media: MediaAsset[];
  onUploaded: (asset: MediaAsset) => void;
}) {
  return (
    <details className="section-box">
      <summary>Search metadata & indexing</summary>
      <div className="grid">
        <Field
          label="SEO title"
          value={seo.title || ""}
          onChange={(title) => onChange({ ...seo, title })}
        />

      </div>
      <MediaPicker
        label="Social sharing image"
        value={seo.ogImageId ? [seo.ogImageId] : []}
        media={media}
        onUploaded={onUploaded}
        onChange={(ids) => onChange({ ...seo, ogImageId: ids[0] })}
        hint="Optional image displayed when the page is shared on social networks."
      />
      <Field
        label="SEO description"
        value={seo.description || ""}
        onChange={(description) => onChange({ ...seo, description })}
        multiline
      />
      <label className="check">
        <input
          type="checkbox"
          checked={seo.noindex}
          onChange={(e) => onChange({ ...seo, noindex: e.target.checked })}
        />
        Exclude this content from indexing
      </label>
      <div className="notice">
        <strong>{seo.title || "Page title"}</strong>
        <p>{seo.description || "Search description preview"}</p>
      </div>
    </details>
  );
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The request could not be completed.";
}
export function slugify(text: string) {
  const from = "абвгдеёзийклмнопрстуфхцчшщъыьэюя";
  const to = [
    "a",
    "b",
    "v",
    "g",
    "d",
    "e",
    "e",
    "z",
    "i",
    "i",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "r",
    "s",
    "t",
    "u",
    "f",
    "h",
    "ts",
    "ch",
    "sh",
    "sch",
    "",
    "y",
    "",
    "e",
    "yu",
    "ya",
  ];
  return text
    .toLowerCase()
    .split("")
    .map((c) => {
      const i = from.indexOf(c);
      return i < 0 ? c : to[i];
    })
    .join("")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
