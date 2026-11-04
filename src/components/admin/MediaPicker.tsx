"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { MediaAsset } from "@/shared/content";
import { api } from "./api";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Не удалось загрузить изображение.";

type Props = {
  label: string;
  value: string[];
  media: MediaAsset[];
  onChange: (ids: string[]) => void;
  onUploaded: (asset: MediaAsset) => void;
  multiple?: boolean;
  hint?: string;
};

export function MediaPicker({
  label,
  value,
  media,
  onChange,
  onUploaded,
  multiple = false,
  hint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = value
    .map((id) => media.find((m) => m.id === id))
    .filter((m): m is MediaAsset => Boolean(m));
  const available = media.filter((m) =>
    (m.alt + " " + m.caption + " " + m.credit)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    if (multiple) {
      onChange(
        value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
      );
    } else {
      onChange(value[0] === id ? [] : [id]);
      setOpen(false);
    }
  }

  function move(index: number, offset: number) {
    const next = [...value];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }

  async function upload() {
    if (!file || !alt.trim()) {
      setError("Выберите изображение и опишите, что на нём изображено.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Изображение слишком большое. Максимальный размер — 5 МБ.");
      return;
    }
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("alt", alt.trim());
      payload.set("credit", credit.trim());
      payload.set("caption", "");
      const result = await api<MediaAsset>("media", "POST", payload);
      onUploaded(result.data);
      onChange(multiple ? [...value, result.data.id] : [result.data.id]);
      setFile(null);
      setAlt("");
      setCredit("");
      setNotice(
        "Фотография загружена и выбрана. Сохраните изменения в редакторе.",
      );
      if (!multiple) setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="cms-media-picker">
      <div className="cms-picker-heading">
        <strong>{label}</strong>
        <span className="muted">
          {multiple
            ? "Выберите фотографии и задайте порядок показа."
            : "Выберите изображение."}
        </span>
      </div>
      {hint && <p className="muted">{hint}</p>}
      {selected.length ? (
        <div className="cms-selected-media">
          {selected.map((asset, index) => (
            <div className="cms-selected-item" key={asset.id}>
              <Image
                src={asset.url}
                alt={asset.alt}
                width={96}
                height={72}
                unoptimized
              />
              <span title={asset.alt}>
                {index + 1}. {asset.alt}
              </span>
              {multiple && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Выше: ${asset.alt}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Ниже: ${asset.alt}`}
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => onChange(value.filter((id) => id !== asset.id))}
              >
                Убрать
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="cms-media-empty">Изображение пока не выбрано.</p>
      )}
      <button
        type="button"
        className="secondary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open
          ? "Закрыть библиотеку"
          : multiple
            ? "Добавить фотографии"
            : "Выбрать изображение"}
      </button>
      {open && (
        <div className="cms-picker-library">
          <label>
            Найти фотографию
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по описанию"
            />
          </label>
          <div className="cms-picker-grid" role="group" aria-label={label}>
            {available.map((asset) => (
              <button
                type="button"
                key={asset.id}
                className={`cms-picker-option ${value.includes(asset.id) ? "selected" : ""}`}
                aria-pressed={value.includes(asset.id)}
                onClick={() => toggle(asset.id)}
              >
                <Image
                  src={asset.url}
                  alt={asset.alt}
                  width={160}
                  height={110}
                  unoptimized
                />
                <span>{asset.alt}</span>
                {value.includes(asset.id) && <small>Выбрано</small>}
              </button>
            ))}
          </div>
          {!available.length && (
            <p className="muted">
              {media.length
                ? "Ничего не найдено. Попробуйте другое описание."
                : "Фотографий пока нет. Загрузите первую ниже."}
            </p>
          )}
          <div className="cms-picker-upload">
            <h3>Загрузить фотографию</h3>
            <p className="muted">
              JPEG, PNG или WebP до 5 МБ. Фотографии сохранятся в библиотеке.
            </p>
            <label>
              Файл изображения
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Что изображено на фотографии (обязательно)
              <input
                value={alt}
                maxLength={500}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Например: уютный кабинет для консультаций"
              />
            </label>
            <label>
              Автор фотографии (необязательно)
              <input
                value={credit}
                maxLength={500}
                onChange={(e) => setCredit(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={uploading || !file || !alt.trim()}
              onClick={() => void upload()}
            >
              {uploading ? "Загружаем…" : "Загрузить и выбрать"}
            </button>
          </div>
          <p className="muted">
            Изменить описание, подпись или автора можно в библиотеке.{" "}
            <Link href="/admin/media">Открыть фотографии</Link>.
          </p>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
