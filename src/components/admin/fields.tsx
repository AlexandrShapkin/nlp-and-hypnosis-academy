"use client";
import { useId } from "react";
import type { Seo, MediaAsset } from "@/shared/content";
import { MediaPicker } from "./MediaPicker";
import { russianName, menuNames } from "./messages";
import { ZodError } from "zod";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
  error?: string;
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? hintId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? hintId : undefined}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
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
  const id = useId();
  return (
    <div style={{ marginBottom: 15 }}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((value) => (
          <option key={value} value={value}>
            {label.includes("меню") ||
            label === "Расположение" ||
            label === "Где показывать меню"
              ? menuNames[value as keyof typeof menuNames] || russianName(value)
              : russianName(value)}
          </option>
        ))}
      </select>
    </div>
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
      <summary>Как страница выглядит в поиске</summary>
      <div className="grid">
        <Field
          label="Заголовок для поисковых систем"
          value={seo.title || ""}
          onChange={(title) => onChange({ ...seo, title })}
        />
      </div>
      <MediaPicker
        label="Изображение для социальных сетей"
        value={seo.ogImageId ? [seo.ogImageId] : []}
        media={media}
        onUploaded={onUploaded}
        onChange={(ids) => onChange({ ...seo, ogImageId: ids[0] })}
        hint="Эту фотографию увидят при отправке ссылки на страницу."
      />
      <Field
        label="Описание страницы"
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
        Скрывать страницу от поисковых систем
      </label>
      <div className="notice">
        <strong>{seo.title || "Название страницы"}</strong>
        <p>{seo.description || "Здесь появится описание для поиска"}</p>
      </div>
    </details>
  );
}
export function errorMessage(error: unknown) {
  if (error instanceof ZodError)
    return error.issues
      .map(
        (issue) =>
          `${russianName(String(issue.path.at(-1) || "title"))}: ${issue.code === "too_small" ? "заполните поле" : issue.code === "too_big" ? "сократите значение" : "проверьте значение"}`,
      )
      .join(". ");
  return error instanceof Error && /[а-яё]/i.test(error.message)
    ? error.message
    : "Не удалось выполнить действие. Проверьте соединение и повторите попытку.";
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
