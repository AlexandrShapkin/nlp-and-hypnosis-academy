"use client";
import { useEffect, useState } from "react";
import {
  settingsSchema,
  type Settings,
  type MediaAsset,
} from "@/shared/content";
import Image from "next/image";
import { useUnsavedChanges } from "./useUnsavedChanges";
import { MediaPicker } from "./MediaPicker";
import { api } from "./api";
import { Field, SeoFields, errorMessage } from "./fields";
type TextSetting = Exclude<
  keyof Settings,
  "seo" | "logoImageId" | "footerLogoImageId" | "faviconImageId"
>;
const labels: Record<TextSetting, string> = {
  siteTitle: "Название сайта",
  description: "Описание сайта",
  brandLabel: "Подпись рядом с логотипом",
  phone: "Телефон",
  email: "Электронная почта для связи",
  bookingLabel: "Текст кнопки записи",
  bookingUrl: "Куда ведёт кнопка записи",
  footerText: "Текст внизу сайта",
  legalText: "Юридическая информация",
  privacyVersion: "Версия согласия на обработку данных",
  socialUrl: "Ссылка на социальную сеть",
};
export function SettingsEditor() {
  const [draft, setDraft] = useState<Settings | null>(null);
  const [baseline, setBaseline] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const onUploaded = (asset: MediaAsset) =>
    setMedia((items) => [...items, asset]);
  const dirty =
    draft !== null && baseline !== "" && JSON.stringify(draft) !== baseline;
  useUnsavedChanges(dirty);
  const loaded = draft !== null;
  useEffect(() => {
    if (loaded && window.location.hash === "#branding")
      document.getElementById("branding")?.scrollIntoView();
  }, [loaded]);
  useEffect(() => {
    void api<MediaAsset[]>("media")
      .then((r) => setMedia(r.data))
      .catch((e) => setError(errorMessage(e)));
    void api<Settings>("settings")
      .then((r) => {
        setDraft(r.data);
        setBaseline(JSON.stringify(r.data));
        setVersion(r.version ?? 1);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <>
      <h1>Настройки сайта</h1>
      <p className="intro">
        Название, логотипы, контакты и общие настройки. Сохранение сразу
        применяет изменения на сайте.
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
      {draft ? (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            try {
              const validated = settingsSchema.parse(draft);
              const result = await api<Settings>("settings", "PATCH", {
                version,
                ...validated,
              });
              setDraft(result.data);
              setBaseline(JSON.stringify(result.data));
              setVersion(result.version ?? version + 1);
              setMessage("Настройки сохранены и применены на сайте.");
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Название и описание</h2>
          <div className="grid">
            {Object.entries(labels)
              .filter(([key]) =>
                ["siteTitle", "brandLabel", "description"].includes(key),
              )
              .map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={draft[key as TextSetting]}
                  multiline={[
                    "description",
                    "footerText",
                    "legalText",
                  ].includes(key)}
                  onChange={(value) => setDraft({ ...draft, [key]: value })}
                />
              ))}
          </div>
          <div id="branding" className="cms-brand-settings">
            <h2>Логотипы и иконка сайта</h2>
            <div className="cms-brand-previews">
              {[
                [draft.logoImageId, "Шапка сайта"],
                [draft.footerLogoImageId, "Подвал сайта"],
              ].map(([id, label], i) => {
                const asset = media.find((item) => item.id === id);
                return (
                  <div
                    className={`cms-brand-preview ${i === 1 ? "dark" : ""}`}
                    key={label}
                  >
                    <small>{label}</small>
                    {asset ? (
                      <Image
                        src={asset.url}
                        alt={asset.alt}
                        width={200}
                        height={90}
                        unoptimized
                      />
                    ) : (
                      <strong>{draft.brandLabel || draft.siteTitle}</strong>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="muted">
              Выберите изображения из библиотеки или загрузите новые. Если
              логотип не выбран, на сайте останется текстовое название.
            </p>
            <MediaPicker
              label="Логотип в шапке сайта"
              value={draft.logoImageId ? [draft.logoImageId] : []}
              media={media}
              onUploaded={onUploaded}
              onChange={(ids) => setDraft({ ...draft, logoImageId: ids[0] })}
              hint="Лучше всего подходит горизонтальный логотип, хорошо заметный на светлом фоне."
            />
            <MediaPicker
              label="Логотип в подвале сайта"
              value={draft.footerLogoImageId ? [draft.footerLogoImageId] : []}
              media={media}
              onUploaded={onUploaded}
              onChange={(ids) =>
                setDraft({ ...draft, footerLogoImageId: ids[0] })
              }
              hint="Можно выбрать отдельный логотип для тёмного фона. Без изображения останется текстовое название."
            />
            <MediaPicker
              label="Иконка сайта"
              value={draft.faviconImageId ? [draft.faviconImageId] : []}
              media={media}
              onUploaded={onUploaded}
              onChange={(ids) => setDraft({ ...draft, faviconImageId: ids[0] })}
              hint="Небольшое квадратное изображение для вкладки браузера."
            />
          </div>
          <h2>Контакты и запись</h2>
          <div className="grid">
            {Object.entries(labels)
              .filter(([key]) =>
                [
                  "phone",
                  "email",
                  "bookingLabel",
                  "bookingUrl",
                  "socialUrl",
                ].includes(key),
              )
              .map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={draft[key as TextSetting]}
                  onChange={(value) => setDraft({ ...draft, [key]: value })}
                />
              ))}
          </div>
          <details className="section-box">
            <summary>Текст внизу сайта и юридическая информация</summary>
            {Object.entries(labels)
              .filter(([key]) =>
                ["footerText", "legalText", "privacyVersion"].includes(key),
              )
              .map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={draft[key as TextSetting]}
                  multiline={key !== "privacyVersion"}
                  onChange={(value) => setDraft({ ...draft, [key]: value })}
                />
              ))}
          </details>
          <SeoFields
            seo={draft.seo}
            onChange={(seo) => setDraft({ ...draft, seo })}
            media={media}
            onUploaded={onUploaded}
          />
          {dirty && (
            <p className="badge" role="status">
              Есть несохранённые изменения
            </p>
          )}
          <button disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить и применить настройки"}
          </button>
          <p className="muted">
            Тексты политики конфиденциальности и условий использования находятся
            в «Страницах сайта». При изменении текста согласия обновите его
            версию.
          </p>
        </form>
      ) : (
        <p>Загружаем настройки…</p>
      )}
    </>
  );
}
