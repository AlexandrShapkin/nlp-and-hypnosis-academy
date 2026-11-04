"use client";
import { useEffect, useState } from "react";
import type { NavigationItem } from "@/shared/content";
import { api } from "./api";
import { Field, Select, errorMessage } from "./fields";
export function NavigationEditor() {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<NavigationItem[]>("navigation")
      .then((r) => {
        setItems(r.data);
        setVersion(r.version ?? 1);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  function update(index: number, patch: Partial<NavigationItem>) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
    setMessage("");
  }
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setItems(next.map((v, i) => ({ ...v, order: i })));
  }
  return (
    <>
      <h1>Navigation</h1>
      <p className="intro">
        Published cards generate working links automatically. Reorder entries
        and edit labels here; unpublished content is excluded by the server.
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
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api<NavigationItem[]>("navigation", "PATCH", {
              version,
              items: items.map((item, order) => ({ ...item, order })),
            });
            setItems(result.data);
            setVersion(result.version ?? version + 1);
            setMessage("Navigation saved.");
          } catch (error) {
            setError(errorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        {items.map((item, index) => (
          <div className="panel" key={item.id}>
            <div className="toolbar">
              <span className="badge">
                {item.automatic ? "Automatic content link" : "Manual link"}
              </span>
              <label className="check">
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(e) => update(index, { visible: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            <div className="grid">
              <Field
                label="Menu label"
                value={item.label}
                onChange={(label) => update(index, { label })}
              />
              <Select
                label="Menu group"
                value={item.group}
                options={["primary", "footer"]}
                onChange={(group) =>
                  update(index, { group: group as "primary" | "footer" })
                }
              />
            </div>
            <label>
              Destination
              <input
                value={item.href}
                disabled={item.automatic}
                onChange={(e) =>
                  update(index, {
                    href: e.target.value,
                    target: { kind: "external", url: e.target.value },
                  })
                }
              />
              {item.automatic && (
                <span className="muted">
                  Resolved from the published content ID; follows future slug
                  changes.
                </span>
              )}
            </label>
            <div className="toolbar">
              <button
                type="button"
                className="secondary"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="secondary"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                Move down
              </button>
              {!item.automatic && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  Remove link
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="toolbar">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setItems([
                ...items,
                {
                  id: crypto.randomUUID(),
                  label: "New link",
                  href: "/#contact",
                  group: "primary",
                  order: items.length,
                  visible: true,
                  target: { kind: "external", url: "/#contact" },
                  automatic: false,
                },
              ])
            }
          >
            Add manual link
          </button>
          <button disabled={busy}>
            {busy ? "Saving…" : "Save navigation"}
          </button>
        </div>
      </form>
    </>
  );
}
