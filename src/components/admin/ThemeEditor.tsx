"use client";
import { useEffect, useState } from "react";
import { defaultTheme, themeSchema, type Theme } from "@/shared/content";
import { russianName, russianDate } from "./messages";
import { useUnsavedChanges } from "./useUnsavedChanges";
import { api } from "./api";
import { errorMessage, Select } from "./fields";
type ThemeState = {
  draft: Theme;
  published: Theme;
  version: number;
  history: { id: string; tokens: Theme; createdAt: string }[];
};
const colors = [
  "background",
  "surface",
  "text",
  "muted",
  "primary",
  "accent",
  "border",
] as const;
const enums = {
  fontBody: ["sans", "serif"],
  fontHeading: ["sans", "serif"],
  buttonVariant: ["solid", "outline"],
  heroVariant: ["split", "centered"],
  shadow: ["none", "soft"],
  borderStyle: ["solid", "none"],
  headingWeight: ["400", "500", "600", "700"],
} as const;
const numbers = {
  fontScale: [0.9, 1.3, 0.05],
  contentWidth: [900, 1440, 10],
  sectionSpacing: [40, 140, 4],
  cardGap: [12, 48, 2],
  radius: [0, 40, 1],
} as const;
export function ThemeEditor() {
  const [state, setState] = useState<ThemeState | null>(null);
  const [tokens, setTokens] = useState<Theme>(defaultTheme);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  async function load() {
    const result = await api<ThemeState>("theme");
    setState({
      ...result.data,
      version: result.data.version ?? result.version ?? 1,
    });
    setTokens(result.data.draft);
    setDirty(false);
  }
  useEffect(() => {
    void api<ThemeState>("theme")
      .then((r) => {
        setState({ ...r.data, version: r.data.version ?? r.version ?? 1 });
        setTokens(r.data.draft);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  function update<K extends keyof Theme>(key: K, value: Theme[K]) {
    setTokens({ ...tokens, [key]: value });
    setDirty(true);
    setMessage("");
  }
  async function action(kind: "save" | "publish" | "restore", id?: string) {
    if (!state) return;
    if (
      kind !== "save" &&
      !confirm(
        kind === "publish"
          ? "Применить сохранённое оформление ко всему сайту?"
          : "Восстановить это оформление на сайте?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (kind === "save") {
        const validated = themeSchema.parse(tokens);
        await api("theme", "PATCH", { version: state.version, ...validated });
      } else
        await api(
          kind === "publish" ? "theme/publish" : `theme/${id}/restore`,
          "POST",
          { version: state.version },
        );
      await load();
      setMessage(
        kind === "save"
          ? "Оформление сохранено в черновик. Сайт пока выглядит по-прежнему."
          : kind === "publish"
            ? "Оформление опубликовано. Изменения видны на сайте."
            : "Прежнее оформление восстановлено.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Оформление</h1>
      <p className="intro">
        Подберите цвета, шрифты и отступы. Посмотрите результат ниже, сохраните
        оформление и опубликуйте его.
      </p>
      <p className="badge" role="status">
        {dirty
          ? "Есть несохранённые изменения"
          : state &&
              JSON.stringify(state.draft) !== JSON.stringify(state.published)
            ? "Черновик сохранён · на сайте прежнее оформление"
            : "Опубликованное оформление"}
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
      {!state ? (
        <p>Загружаем оформление…</p>
      ) : (
        <>
          <div className="panel">
            <h2>Цвета сайта</h2>
            <div className="grid">
              {colors.map((key) => (
                <label key={russianName(key)}>
                  {russianName(key)}
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="color"
                      aria-label={`${russianName(key)}: выбрать цвет`}
                      value={tokens[key]}
                      onChange={(e) => update(key, e.target.value)}
                      style={{ width: 60 }}
                    />
                    <input
                      aria-label={`${russianName(key)}: код цвета`}
                      value={tokens[key]}
                      pattern="#[0-9a-fA-F]{6}"
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                </label>
              ))}
            </div>
            <h2>Шрифты, кнопки и отступы</h2>
            <div className="grid">
              {Object.entries(enums).map(([key, options]) => (
                <Select
                  key={russianName(key)}
                  label={russianName(key)}
                  value={String(tokens[key as keyof Theme])}
                  options={options}
                  onChange={(value) =>
                    update(key as keyof Theme, value as never)
                  }
                />
              ))}
              {Object.entries(numbers).map(([key, [min, max, step]]) => (
                <label key={russianName(key)}>
                  {russianName(key)}
                  <input
                    type="number"
                    value={Number(tokens[key as keyof Theme])}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(e) =>
                      update(
                        key as keyof Theme,
                        Number(e.target.value) as never,
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <div className="toolbar">
              <button
                disabled={busy || !dirty}
                onClick={() => void action("save")}
              >
                Сохранить оформление
              </button>
              <button
                disabled={busy || dirty}
                onClick={() => void action("publish")}
              >
                Опубликовать оформление
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setTokens(state.published);
                  setDirty(true);
                }}
              >
                Вернуть опубликованное оформление в редактор
              </button>
            </div>
          </div>
          <section
            className="preview"
            aria-label="Предпросмотр оформления"
            style={{
              background: tokens.background,
              color: tokens.text,
              fontFamily:
                tokens.fontBody === "serif"
                  ? "Georgia, serif"
                  : "Arial, sans-serif",
              fontSize: `${tokens.fontScale}rem`,
              borderRadius: tokens.radius,
              padding: tokens.sectionSpacing / 2,
            }}
          >
            <span className="badge">Предпросмотр · виден только вам</span>
            <h2
              style={{
                fontFamily:
                  tokens.fontHeading === "serif"
                    ? "Georgia, serif"
                    : "Arial, sans-serif",
                fontWeight: Number(tokens.headingWeight),
              }}
            >
              Пространство для осознанных изменений
            </h2>
            <p style={{ color: tokens.muted }}>
              Предварительный просмотр типографики, цвета и компонентов.
            </p>
            <div
              style={{
                background: tokens.surface,
                border: `1px ${tokens.borderStyle} ${tokens.border}`,
                borderRadius: tokens.radius,
                padding: 24,
                marginBottom: tokens.cardGap,
                boxShadow:
                  tokens.shadow === "soft" ? "0 8px 24px #00000010" : "none",
              }}
            >
              Содержимое карточки
            </div>
            <span
              style={{
                display: "inline-block",
                padding: "12px 22px",
                border: `1px solid ${tokens.primary}`,
                background:
                  tokens.buttonVariant === "solid"
                    ? tokens.primary
                    : "transparent",
                color:
                  tokens.buttonVariant === "solid"
                    ? tokens.surface
                    : tokens.primary,
                borderRadius: tokens.radius,
              }}
            >
              Обсудить вопрос
            </span>
          </section>
          <div className="panel">
            <h2>История оформления</h2>
            <p className="muted">
              Можно вернуть любой ранее опубликованный вариант. Восстановление
              сразу изменит оформление сайта.
            </p>
            {state.history.map((item) => (
              <div key={item.id} className="list-row">
                <span>{russianDate(item.createdAt)}</span>
                <span
                  style={{
                    background: item.tokens.primary,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                  }}
                />
                <button
                  className="secondary"
                  disabled={busy || dirty}
                  onClick={() => void action("restore", item.id)}
                >
                  Восстановить эту версию
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
