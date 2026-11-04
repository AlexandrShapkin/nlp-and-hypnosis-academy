"use client";
import { useEffect, useState } from "react";
import { defaultTheme, themeSchema, type Theme } from "@/shared/content";
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
          ? "Publish the saved theme to all public pages?"
          : "Restore this earlier published theme?",
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
          ? "Theme draft saved. Public styles are unchanged."
          : kind === "publish"
            ? "Theme published."
            : "Previous theme restored.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Design & theme</h1>
      <p className="intro">
        Approved tokens keep changes safe and consistent. Preview locally, save
        the draft, then publish.
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
        <p>Loading theme…</p>
      ) : (
        <>
          <div className="panel">
            <h2>Brand colors</h2>
            <div className="grid">
              {colors.map((key) => (
                <label key={key}>
                  {key}
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="color"
                      aria-label={`${key} color picker`}
                      value={tokens[key]}
                      onChange={(e) => update(key, e.target.value)}
                      style={{ width: 60 }}
                    />
                    <input
                      aria-label={`${key} hex color`}
                      value={tokens[key]}
                      pattern="#[0-9a-fA-F]{6}"
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                </label>
              ))}
            </div>
            <h2>Typography, layout & controls</h2>
            <div className="grid">
              {Object.entries(enums).map(([key, options]) => (
                <Select
                  key={key}
                  label={key}
                  value={String(tokens[key as keyof Theme])}
                  options={options}
                  onChange={(value) =>
                    update(key as keyof Theme, value as never)
                  }
                />
              ))}
              {Object.entries(numbers).map(([key, [min, max, step]]) => (
                <label key={key}>
                  {key}
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
                Save theme draft
              </button>
              <button
                disabled={busy || dirty}
                onClick={() => void action("publish")}
              >
                Publish theme
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setTokens(state.published);
                  setDirty(true);
                }}
              >
                Copy published tokens to draft
              </button>
            </div>
          </div>
          <section
            className="preview"
            aria-label="Private theme preview"
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
            <span className="badge">Private live preview · noindex</span>
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
            <h2>Published theme history & rollback</h2>
            <p className="muted">
              Restoring activates a previously validated version and creates an
              audit event.
            </p>
            {state.history.map((item) => (
              <div key={item.id} className="list-row">
                <span>
                  {item.createdAt} <code>{item.id.slice(0, 8)}</code>
                </span>
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
                  Restore version
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
