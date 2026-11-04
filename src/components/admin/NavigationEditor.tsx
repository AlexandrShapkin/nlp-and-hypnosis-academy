"use client";
import { useEffect, useState } from "react";
import type {
  NavigationItem,
  Entity,
  PageDraft,
  CardDraft,
} from "@/shared/content";
import { api } from "./api";
import { Field, Select, errorMessage } from "./fields";
import { useUnsavedChanges } from "./useUnsavedChanges";
type Destination = {
  value: string;
  label: string;
  href: string;
  target: NonNullable<NavigationItem["target"]>;
};
export function NavigationEditor() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => {
    void api<NavigationItem[]>("navigation")
      .then((r) => {
        setItems(r.data);
        setVersion(r.version ?? 1);
      })
      .catch((e) => setError(errorMessage(e)));
    void Promise.all([
      api<Entity<PageDraft>[]>("pages"),
      api<Entity<CardDraft>[]>("cards"),
    ])
      .then(([pages, cards]) => {
        const choices: Destination[] = [];
        pages.data.forEach((entity) => {
          if (!entity.published || entity.state !== "published") return;
          const page = entity.published;
          const href =
            page.slug === "home"
              ? "/"
              : page.slug === "privacy" || page.slug === "terms"
                ? `/${page.slug}`
                : `/pages/${page.slug}`;
          choices.push({
            value: `page:${entity.id}`,
            label: page.title,
            href,
            target: { kind: "page", id: entity.id },
          });
          if (page.slug === "home")
            page.sections
              .filter((section) => section.visible)
              .forEach((section) =>
                choices.push({
                  value: `section:${section.id}`,
                  label: `Раздел: ${section.heading || "Без названия"}`,
                  href: `/#${section.key}`,
                  target: { kind: "section", id: section.id },
                }),
              );
        });
        cards.data.forEach((entity) => {
          if (entity.published && entity.state === "published")
            choices.push({
              value: `card:${entity.id}`,
              label: `Материал: ${entity.published.title}`,
              href: `/topics/${entity.published.slug}`,
              target: { kind: "card", id: entity.id },
            });
        });
        setDestinations(choices);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  function change(next: NavigationItem[]) {
    setItems(next);
    setDirty(true);
    setMessage("");
  }
  function update(index: number, patch: Partial<NavigationItem>) {
    change(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change(next.map((item, order) => ({ ...item, order })));
  }
  return (
    <>
      <h1>Меню сайта</h1>
      <p className="intro">
        Опубликованные материалы добавляются в меню автоматически. Здесь можно
        поменять названия, порядок и расположение ссылок.
      </p>
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
      {dirty && (
        <p className="badge" role="status">
          Есть несохранённые изменения
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api<NavigationItem[]>("navigation", "PATCH", {
              version,
              items: items.map((item, order) => ({ ...item, order })),
            });
            setItems(r.data);
            setVersion(r.version ?? version + 1);
            setDirty(false);
            setMessage("Меню сохранено. Изменения уже видны на сайте.");
          } catch (error) {
            setError(errorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        {!items.length && (
          <p className="panel">
            В меню пока нет ссылок. Добавьте ссылку или опубликуйте материал с
            включённым пунктом «Показывать в меню».
          </p>
        )}
        {items.map((item, index) => {
          const resolved =
            destinations.find(
              (destination) =>
                destination.target.kind === item.target?.kind &&
                destination.target.id === item.target?.id,
            ) ||
            destinations.find((destination) => destination.href === item.href);
          return (
            <div className="panel" key={item.id}>
              <div className="toolbar">
                <span className="badge">
                  {item.automatic
                    ? "Ссылка на опубликованный материал"
                    : "Добавленная ссылка"}
                </span>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={(e) =>
                      update(index, { visible: e.target.checked })
                    }
                  />
                  Показывать
                </label>
              </div>
              <div className="grid">
                <Field
                  label="Название в меню"
                  value={item.label}
                  onChange={(label) => update(index, { label })}
                />
                <Select
                  label="Расположение"
                  value={item.group}
                  options={["primary", "footer"]}
                  onChange={(group) =>
                    update(index, { group: group as "primary" | "footer" })
                  }
                />
              </div>
              {item.automatic ? (
                <p className="muted">
                  Открывает: {resolved?.label || item.label}. Адрес обновляется
                  автоматически при изменении материала.
                </p>
              ) : (
                <>
                  <label>
                    Куда ведёт ссылка
                    <select
                      value={resolved?.value || "custom"}
                      onChange={(e) => {
                        const destination = destinations.find(
                          (option) => option.value === e.target.value,
                        );
                        if (destination)
                          update(index, {
                            href: destination.href,
                            target: destination.target,
                          });
                        else
                          update(index, {
                            href: "https://",
                            target: { kind: "external", url: "https://" },
                          });
                      }}
                    >
                      {destinations.map((destination) => (
                        <option
                          key={destination.value}
                          value={destination.value}
                        >
                          {destination.label}
                        </option>
                      ))}
                      <option value="custom">Другой сайт или свой адрес</option>
                    </select>
                  </label>
                  {!resolved && (
                    <Field
                      label="Адрес ссылки"
                      value={item.href}
                      onChange={(href) =>
                        update(index, {
                          href,
                          target: { kind: "external", url: href },
                        })
                      }
                      hint="Например, https://example.ru. Для страниц этого сайта удобнее выбрать название из списка выше."
                    />
                  )}
                </>
              )}
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
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Ниже
                </button>
                {!item.automatic && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      if (confirm("Удалить эту ссылку из меню?"))
                        change(items.filter((_, i) => i !== index));
                    }}
                  >
                    Удалить ссылку
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div className="toolbar">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const destination = destinations[0];
              change([
                ...items,
                {
                  id: crypto.randomUUID(),
                  label: "Новая ссылка",
                  href: destination?.href || "/",
                  target: destination?.target || { kind: "external", url: "/" },
                  group: "primary",
                  order: items.length,
                  visible: true,
                  automatic: false,
                },
              ]);
            }}
          >
            Добавить ссылку
          </button>
          <button disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить и применить меню"}
          </button>
        </div>
      </form>
    </>
  );
}
