"use client";
import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";
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
import { api, CmsRequestError } from "./api";
import { Field, Select, SeoFields, errorMessage, slugify } from "./fields";
import { MediaPicker } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";
import { russianName, unsavedMessage } from "./messages";
import { useUnsavedChanges } from "./useUnsavedChanges";
type Draft = CardDraft | PageDraft;
const emptyCard = () => ({
  ...cardSchema.parse({ title: "Новый материал", slug: "new-card" }),
  title: "",
});
const emptyPage = () => ({
  ...pageSchema.parse({ title: "Новая страница", slug: "new-page" }),
  title: "",
});
export function ContentEditor({ kind }: { kind: "cards" | "pages" }) {
  const sectionSelectId = useId();
  const [entities, setEntities] = useState<Entity<Draft>[]>([]);
  const [selected, setSelected] = useState<Entity<Draft> | null>(null);
  const [draft, setDraft] = useState<Draft>(
    kind === "cards" ? emptyCard() : emptyPage(),
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [homeSections, setHomeSections] = useState<Block[]>([]);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  useUnsavedChanges(dirty);
  const onUploaded = (asset: MediaAsset) =>
    setMedia((items) => [...items, asset]);
  const load = useCallback(
    async () => setEntities((await api<Entity<Draft>[]>(kind)).data),
    [kind],
  );
  useEffect(() => {
    void api<Entity<Draft>[]>(kind)
      .then((r) => {
        setEntities(r.data);
        const query = new URLSearchParams(window.location.search);
        if (kind === "pages" && query.has("home")) {
          const home = r.data.find((entity) => entity.draft.slug === "home");
          if (home) {
            setSelected(home);
            setDraft(home.draft);
          }
        }
        if (kind === "cards" && query.get("new") === "service")
          setDraft({ ...emptyCard(), type: "service" });
      })
      .catch((e) => setError(errorMessage(e)));
    void api<MediaAsset[]>("media")
      .then((r) => setMedia(r.data))
      .catch((e) => setError(errorMessage(e)));
    if (kind === "cards")
      void api<Entity<PageDraft>[]>("pages")
        .then((r) =>
          setHomeSections(
            r.data.find((e) => e.draft.slug === "home")?.draft.sections || [],
          ),
        )
        .catch((e) => setError(errorMessage(e)));
  }, [kind]);
  function edit(entity: Entity<Draft> | null) {
    if (dirty && !confirm(unsavedMessage)) return;
    setSelected(entity);
    setDraft(
      entity ? entity.draft : kind === "cards" ? emptyCard() : emptyPage(),
    );
    setDirty(false);
    setSlugTouched(false);
    setError("");
    setMessage("");
    setFieldErrors({});
  }
  function update(patch: Partial<CardDraft & PageDraft>) {
    setDraft({ ...draft, ...patch });
    setDirty(true);
    setMessage("");
    setFieldErrors((errors) =>
      Object.fromEntries(
        Object.entries(errors).filter(([key]) => !(key in patch)),
      ),
    );
  }
  async function save(preview = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = (kind === "cards" ? cardSchema : pageSchema).safeParse(
        draft,
      );
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          errors[issue.path.join(".")] =
            issue.code === "too_small"
              ? "Заполните это поле."
              : "Проверьте значение этого поля.";
        });
        setFieldErrors(errors);
        setError(errorMessage(result.error));
        return null;
      }
      const response = await api<Entity<Draft>>(
        selected ? `${kind}/${selected.id}` : kind,
        selected ? "PATCH" : "POST",
        { ...result.data, ...(selected ? { version: selected.version } : {}) },
      );
      setSelected(response.data);
      setDraft(response.data.draft);
      setDirty(false);
      setFieldErrors({});
      setMessage(
        "Изменения сохранены в черновик. На сайте пока прежняя версия.",
      );
      await load();
      if (preview)
        window.open(
          `/admin/preview/${kind}/${response.data.id}`,
          "_blank",
          "noopener,noreferrer",
        );
      return response.data;
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof CmsRequestError)
        setFieldErrors(
          Object.fromEntries(
            Object.entries(e.fields).map(([key, values]) => [
              key,
              values.join(". "),
            ]),
          ),
        );
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function publish(action: "publish" | "unpublish") {
    if (dirty || !selected) {
      setError("Сначала сохраните изменения.");
      return;
    }
    if (
      !confirm(
        action === "publish"
          ? "Опубликовать сохранённые изменения на сайте?"
          : "Скрыть материал на сайте и убрать его из меню?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await api<Entity<Draft>>(
        `${kind}/${selected.id}/${action}`,
        "POST",
        { version: selected.version },
      );
      setSelected(response.data);
      setDraft(response.data.draft);
      setMessage(
        action === "publish"
          ? "Опубликовано. Изменения уже видны на сайте."
          : "Материал снят с публикации и скрыт на сайте.",
      );
      await load();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof CmsRequestError)
        setFieldErrors(
          Object.fromEntries(
            Object.entries(e.fields).map(([key, values]) => [
              key,
              values.join(". "),
            ]),
          ),
        );
    } finally {
      setBusy(false);
    }
  }
  const isCard = "type" in draft;
  const savedDraft =
    selected?.published &&
    JSON.stringify(selected.draft) !== JSON.stringify(selected.published);
  return (
    <>
      <h1>{kind === "cards" ? "Карточки и материалы" : "Страницы сайта"}</h1>
      <p className="intro">
        Сохраните изменения, посмотрите результат и опубликуйте, когда всё
        готово.
      </p>
      <div className="editor-layout">
        <aside className="panel cms-content-list">
          <button onClick={() => edit(null)}>
            {kind === "cards" ? "Создать карточку" : "Создать страницу"}
          </button>
          <label className="cms-search-label">
            Найти по названию
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Начните вводить название"
            />
          </label>
          {!entities.length && (
            <p className="muted">
              Материалов пока нет. Создайте первый с помощью кнопки выше.
            </p>
          )}
          {entities
            .filter((entity) =>
              entity.draft.title.toLowerCase().includes(filter.toLowerCase()),
            )
            .map((entity) => (
              <button
                type="button"
                key={entity.id}
                className={`entity-button ${selected?.id === entity.id ? "active" : ""}`}
                onClick={() => edit(entity)}
              >
                {entity.draft.title}
                <br />
                <span className={`badge ${entity.state}`}>
                  {russianName(entity.state)}
                </span>
                {entity.published &&
                  JSON.stringify(entity.draft) !==
                    JSON.stringify(entity.published) && (
                    <small> · Есть черновик</small>
                  )}
              </button>
            ))}
        </aside>
        <section className="panel">
          <div className="toolbar">
            <h2>{selected ? "Редактирование" : "Новый материал"}</h2>
            <span className="badge" role="status">
              {dirty
                ? "Есть несохранённые изменения"
                : savedDraft
                  ? "Черновик сохранён · на сайте прежняя версия"
                  : selected
                    ? russianName(selected.state)
                    : "Ещё не сохранено"}
            </span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Field
              label="Название"
              value={draft.title}
              error={fieldErrors.title}
              onChange={(title) =>
                update({
                  title,
                  ...(!selected && !slugTouched
                    ? { slug: slugify(title) || `material-${Date.now()}` }
                    : {}),
                })
              }
            />
            {isCard && (
              <>
                <div className="grid">
                  <Select
                    label="Тип материала"
                    value={draft.type}
                    options={cardTypes}
                    onChange={(type) =>
                      update({ type: type as CardDraft["type"] })
                    }
                  />
                  <Select
                    label="Оформление карточки"
                    value={draft.variant}
                    options={["default", "soft", "contrast"]}
                    onChange={(variant) =>
                      update({ variant: variant as CardDraft["variant"] })
                    }
                  />
                </div>
                <Field
                  label="Краткое описание"
                  value={draft.summary}
                  multiline
                  onChange={(summary) => update({ summary })}
                />
              </>
            )}
            {(isCard ||
              (draft.slug !== "home" &&
                !draft.sections.some(
                  (section) => section.visible && section.type === "hero",
                ))) && (
              <RichTextEditor
                key={selected?.id || "new"}
                label="Подробное описание"
                error={fieldErrors.bodyRichText || fieldErrors.body}
                plainText={draft.body}
                value={draft.bodyRichText}
                onChange={(body, bodyRichText) =>
                  update({ body, bodyRichText })
                }
              />
            )}
            {isCard && (
              <>
                <div style={{ marginBottom: 15 }}>
                  <label htmlFor={sectionSelectId}>Раздел сайта</label>
                  <select
                    id={sectionSelectId}
                    aria-describedby={`${sectionSelectId}-hint`}
                    value={draft.sectionId || ""}
                    onChange={(e) =>
                      update({ sectionId: e.target.value || undefined })
                    }
                  >
                    <option value="">
                      Выбрать автоматически по типу материала
                    </option>
                    {homeSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.heading || russianName(section.type)}
                      </option>
                    ))}
                    {draft.sectionId &&
                      !homeSections.some(
                        (section) => section.id === draft.sectionId,
                      ) && (
                        <option value={draft.sectionId}>
                          Ранее выбранный раздел
                        </option>
                      )}
                  </select>
                  <span id={`${sectionSelectId}-hint`} className="muted">
                    В этом разделе главной страницы появится материал.
                  </span>
                </div>
                <MediaPicker
                  label="Фотографии материала"
                  value={draft.mediaIds}
                  media={media}
                  multiple
                  onChange={(mediaIds) => update({ mediaIds })}
                  onUploaded={onUploaded}
                  hint="Первая фотография — обложка карточки. Остальные появятся на странице материала в выбранном порядке."
                />
              </>
            )}
            {!isCard && (
              <Sections
                sections={draft.sections}
                media={media}
                onUploaded={onUploaded}
                onChange={(sections) => update({ sections })}
                errors={fieldErrors}
              />
            )}
            <details className="section-box">
              <summary>Меню сайта</summary>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.showInNavigation}
                  onChange={(e) =>
                    update({ showInNavigation: e.target.checked })
                  }
                />
                Показывать в меню
              </label>
              <div className="grid">
                <Field
                  label="Название в меню"
                  value={draft.navigationLabel || ""}
                  hint="Если не заполнено, используется название материала."
                  onChange={(navigationLabel) => update({ navigationLabel })}
                />
                <Select
                  label="Где показывать меню"
                  value={draft.navigationGroup}
                  options={["primary", "footer"]}
                  onChange={(navigationGroup) =>
                    update({
                      navigationGroup: navigationGroup as "primary" | "footer",
                    })
                  }
                />
              </div>
              {isCard && (
                <label>
                  Куда ведёт ссылка в меню
                  <select
                    value={draft.anchor || ""}
                    onChange={(e) =>
                      update({ anchor: e.target.value || undefined })
                    }
                  >
                    <option value="">На страницу материала</option>
                    {homeSections
                      .filter((section) => section.visible)
                      .map((section) => (
                        <option key={section.key} value={section.key}>
                          К разделу:{" "}
                          {section.heading || russianName(section.type)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </details>
            <SeoFields
              seo={draft.seo}
              onChange={(seo) => update({ seo })}
              media={media}
              onUploaded={onUploaded}
            />
            <details className="section-box">
              <summary>Дополнительные настройки</summary>
              <Field
                label="Адрес страницы"
                value={draft.slug}
                error={fieldErrors.slug}
                onChange={(slug) => {
                  setSlugTouched(true);
                  update({ slug });
                }}
                hint="Обычно адрес создаётся автоматически. Используйте латинские буквы, цифры и дефис."
              />
              {isCard && (
                <Field
                  label="Порядок на странице"
                  type="number"
                  value={String(draft.order)}
                  onChange={(order) => update({ order: Number(order) })}
                  hint="Меньшие числа идут первыми."
                />
              )}
            </details>
            <div className="toolbar cms-editor-actions">
              <button disabled={busy}>
                {busy ? "Сохраняем…" : "Сохранить изменения"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void save(true)}
              >
                Предпросмотр
              </button>
              {selected && (
                <a
                  className="button secondary"
                  href={`/admin/preview/${kind}/${selected.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть предпросмотр сайта
                </a>
              )}
              <button
                type="button"
                disabled={busy || dirty || !selected}
                onClick={() => void publish("publish")}
              >
                Опубликовать
              </button>
              {selected?.published && (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy || dirty}
                  onClick={() => void publish("unpublish")}
                >
                  Снять с публикации
                </button>
              )}
            </div>
          </form>
          {selected && (
            <details className="section-box">
              <summary>Копирование и удаление</summary>
              <div className="toolbar">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    setDraft({
                      ...draft,
                      title: `${draft.title} (копия)`,
                      slug: `${draft.slug.slice(0, 80)}-copy-${Date.now().toString(36)}`,
                    });
                    setDirty(true);
                  }}
                >
                  Создать копию
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !confirm(
                        "Удалить материал? Он исчезнет с сайта и из меню.",
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
                      setMessage("Материал удалён.");
                      await load();
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Удалить материал
                </button>
              </div>
            </details>
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
  errors,
}: {
  sections: Block[];
  media: MediaAsset[];
  onUploaded: (asset: MediaAsset) => void;
  onChange: (sections: Block[]) => void;
  errors: Record<string, string>;
}) {
  const [template, setTemplate] = useState<Block["type"]>("rich_text");
  function update(index: number, patch: Partial<Block>) {
    onChange(
      sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    );
  }
  function move(index: number, offset: number) {
    const next = [...sections];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  function add() {
    const id = crypto.randomUUID();
    onChange([
      ...sections,
      {
        id,
        key: `section-${id.slice(0, 8)}`,
        type: template,
        heading: russianName(template),
        body:
          template === "contact_form"
            ? "Оставьте заявку, и мы свяжемся с вами."
            : "",
        visible: true,
        variant: "default",
        data:
          template === "contact_form"
            ? { submitLabel: "Отправить заявку" }
            : {},
      },
    ]);
  }
  return (
    <div className="cms-sections">
      <h2>Разделы страницы</h2>
      <p className="muted">
        Разделы расположены так же, как на сайте. Откройте раздел, чтобы
        изменить его содержимое.
      </p>
      {sections.map((section, index) => {
        const image = media.find(
          (asset) =>
            asset.id === section.imageId ||
            (Array.isArray(section.data.mediaIds) &&
              asset.id === section.data.mediaIds[0]),
        );
        return (
          <details
            className="section-box cms-section-card"
            key={section.id}
            open={
              Object.keys(errors).some((key) =>
                key.startsWith(`sections.${index}.`),
              ) || undefined
            }
          >
            <summary>
              <span className="cms-section-number">{index + 1}</span>
              {image && (
                <Image
                  src={image.url}
                  alt=""
                  width={56}
                  height={42}
                  unoptimized
                />
              )}
              <span>
                {section.heading || russianName(section.type)}
                <small>
                  {russianName(section.type)} ·{" "}
                  {section.visible ? "Показывается" : "Скрыт"}
                </small>
              </span>
            </summary>
            <Field
              label="Заголовок раздела"
              value={section.heading}
              error={errors[`sections.${index}.heading`]}
              onChange={(heading) => update(index, { heading })}
            />
            <RichTextEditor
              label="Текст раздела"
              error={
                errors[`sections.${index}.bodyRichText`] ||
                errors[`sections.${index}.body`]
              }
              plainText={section.body}
              value={section.bodyRichText}
              onChange={(body, bodyRichText) =>
                update(index, { body, bodyRichText })
              }
            />
            {(section.type === "hero" ||
              section.type === "about" ||
              section.type === "cta") && (
              <Field
                label="Подпись над заголовком"
                value={section.eyebrow || ""}
                onChange={(eyebrow) => update(index, { eyebrow })}
              />
            )}
            {(section.type === "hero" || section.type === "about") && (
              <MediaPicker
                label="Главная фотография"
                value={section.imageId ? [section.imageId] : []}
                media={media}
                onUploaded={onUploaded}
                onChange={(ids) => update(index, { imageId: ids[0] })}
              />
            )}
            {(section.type === "hero" || section.type === "cta") && (
              <div className="grid">
                <Field
                  label="Текст кнопки"
                  error={errors[`sections.${index}.data.ctaLabel`]}
                  value={String(section.data.ctaLabel || "")}
                  onChange={(ctaLabel) =>
                    update(index, { data: { ...section.data, ctaLabel } })
                  }
                />
                <label>
                  Куда ведёт кнопка
                  <select
                    value={String(section.data.ctaUrl || "")}
                    onChange={(e) =>
                      update(index, {
                        data: { ...section.data, ctaUrl: e.target.value },
                      })
                    }
                  >
                    <option value="">Не показывать кнопку</option>
                    {sections
                      .filter((item) => item.visible)
                      .map((item) => (
                        <option key={item.id} value={`/#${item.key}`}>
                          {item.heading || russianName(item.type)}
                        </option>
                      ))}
                    {section.data.ctaUrl &&
                      !sections.some(
                        (item) => `/#${item.key}` === section.data.ctaUrl,
                      ) && (
                        <option value={String(section.data.ctaUrl)}>
                          Выбранная ссылка: {String(section.data.ctaUrl)}
                        </option>
                      )}
                  </select>
                </label>
              </div>
            )}
            {section.type === "contact_form" && (
              <ContactFields
                section={section}
                onChange={(data) => update(index, { data })}
              />
            )}
            <MediaPicker
              label={
                section.type === "media_gallery"
                  ? "Фотографии галереи"
                  : "Фотографии раздела"
              }
              value={
                Array.isArray(section.data.mediaIds)
                  ? section.data.mediaIds
                  : []
              }
              media={media}
              multiple
              onUploaded={onUploaded}
              onChange={(mediaIds) =>
                update(index, { data: { ...section.data, mediaIds } })
              }
              hint="Фотографии показываются в выбранном порядке. Удаление из раздела не удаляет их из библиотеки."
            />
            {Array.isArray(section.data.mediaIds) &&
              section.data.mediaIds.length > 0 && (
                <Select
                  label="Расположение фотографий"
                  value={String(section.data.layout || "grid")}
                  options={["grid", "mosaic", "strip"]}
                  onChange={(layout) =>
                    update(index, { data: { ...section.data, layout } })
                  }
                />
              )}
            <Select
              label="Оформление раздела"
              value={section.variant}
              options={["default", "soft", "contrast"]}
              onChange={(variant) =>
                update(index, { variant: variant as Block["variant"] })
              }
            />
            <label className="check">
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(e) => update(index, { visible: e.target.checked })}
              />
              Показывать на сайте
            </label>
            <details>
              <summary>Дополнительно</summary>
              <Field
                label="Адрес раздела"
                value={section.key}
                onChange={(key) => update(index, { key })}
                hint="Обычно менять не нужно. Существующие ссылки используют этот адрес."
              />
            </details>
            <div className="toolbar">
              <button
                type="button"
                className="secondary"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Выше
              </button>
              <button
                type="button"
                className="secondary"
                disabled={index === sections.length - 1}
                onClick={() => move(index, 1)}
              >
                Ниже
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const id = crypto.randomUUID();
                  const next = [...sections];
                  next.splice(index + 1, 0, {
                    ...structuredClone(section),
                    id,
                    key: `section-${id.slice(0, 8)}`,
                    heading: `${section.heading} (копия)`,
                  });
                  onChange(next);
                }}
              >
                Создать копию раздела
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (
                    confirm(
                      "Удалить раздел из черновика? Фотографии останутся в библиотеке.",
                    )
                  )
                    onChange(sections.filter((_, i) => i !== index));
                }}
              >
                Удалить раздел
              </button>
            </div>
          </details>
        );
      })}
      {!sections.length && (
        <p className="notice">
          Пока нет разделов. Выберите подходящий шаблон ниже.
        </p>
      )}
      <div className="cms-template-picker">
        <Select
          label="Шаблон нового раздела"
          value={template}
          options={blockTypes.filter((type) => type !== "footer")}
          onChange={(type) => setTemplate(type as Block["type"])}
        />
        <button type="button" className="secondary" onClick={add}>
          Добавить раздел
        </button>
      </div>
    </div>
  );
}
function ContactFields({
  section,
  onChange,
}: {
  section: Block;
  onChange: (data: Block["data"]) => void;
}) {
  const labels: Record<string, string> = {
    description: "Текст рядом с контактами",
    nameLabel: "Название поля имени",
    phoneLabel: "Название поля телефона",
    emailLabel: "Название поля почты",
    messageLabel: "Название поля сообщения",
    privacyLabel: "Текст согласия на обработку данных",
    marketingLabel: "Текст согласия на новости",
    submitLabel: "Текст кнопки отправки",
    successMessage: "Сообщение после отправки",
  };
  return (
    <details>
      <summary>Контакты и подписи формы</summary>
      <p className="muted">Телефон и почта берутся из «Настроек сайта».</p>
      {Object.entries(labels).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={String(section.data[key] || "")}
          onChange={(value) => onChange({ ...section.data, [key]: value })}
        />
      ))}
    </details>
  );
}
