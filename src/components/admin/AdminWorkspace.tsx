"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { ContentEditor } from "./ContentEditor";
import { ThemeEditor } from "./ThemeEditor";
import { SettingsEditor } from "./SettingsEditor";
import { NavigationEditor } from "./NavigationEditor";
import { MediaEditor } from "./MediaEditor";
type Row = Record<string, unknown>;
export function AdminWorkspace({ route }: { route: string }) {
  return (
    <>
      {route === "cards" || route === "pages" ? (
        <ContentEditor key={route} kind={route} />
      ) : route === "theme" ? (
        <ThemeEditor />
      ) : route === "settings" ? (
        <SettingsEditor />
      ) : route === "navigation" ? (
        <NavigationEditor />
      ) : route === "media" ? (
        <MediaEditor />
      ) : route === "seo" ? (
        <SeoWorkspace />
      ) : route === "leads" || route === "audit" ? (
        <Records kind={route} />
      ) : (
        <Overview />
      )}
    </>
  );
}
function Overview() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all(
      ["cards", "pages", "leads"].map(async (key) => {
        const r = await api<unknown[]>(key);
        return [key, r.data.length] as const;
      }),
    )
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <p className="eyebrow">EDITORIAL CONTROL</p>
      <h1>Maintainer overview</h1>
      <p className="intro">
        Manage approved content, publishing, and the public site from one
        workspace.
      </p>
      <div className="panel notice">
        <h2>Editorial onboarding</h2>
        <p>
          TODO: review biography, qualifications, service information, legal
          documents, and approved contact details before public launch. Publish
          only verified claims and consented testimonials.
        </p>
        <p>
          Draft saves do not alter the published site. Use Preview, then Publish
          when the content is approved.
        </p>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="grid">
        {Object.entries(counts).map(([key, count]) => (
          <a className="panel" key={key} href={`/admin/${key}`}>
            <h2>{count}</h2>
            {key}
          </a>
        ))}
      </div>
      <div className="panel">
        <h2>Recommended workflow</h2>
        <ol>
          <li>Update global settings and legal pages.</li>
          <li>Edit the home page sections and reusable cards.</li>
          <li>Preview drafts, then publish approved revisions.</li>
          <li>Review generated navigation, SEO, and the public site.</li>
        </ol>
      </div>
    </>
  );
}
function Records({ kind }: { kind: "leads" | "audit" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api<Row[]>(kind)
        .then((r) => setRows(r.data))
        .catch((e) => setError(e.message)),
    [kind],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const keys = Array.from(new Set(rows.flatMap(Object.keys))).filter(
    (k) => k !== "id",
  );
  return (
    <>
      <h1>{kind === "leads" ? "Private inquiries" : "Audit history"}</h1>
      <p className="intro">
        {kind === "leads"
          ? "Restricted personal data. Remove inquiries when no longer needed."
          : "Recorded administrative actions with redacted summaries."}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="panel table-scroll">
        {!rows.length ? (
          <p>No records yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k}>{k}</th>
                ))}
                {kind === "leads" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  {keys.map((k) => (
                    <td key={k}>
                      {typeof row[k] === "object"
                        ? JSON.stringify(row[k])
                        : String(row[k] ?? "")}
                    </td>
                  ))}
                  {kind === "leads" && (
                    <td>
                      <button
                        className="danger"
                        onClick={async () => {
                          if (!confirm("Permanently delete this inquiry?"))
                            return;
                          try {
                            await api(`leads/${row.id}`, "DELETE");
                            void load();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Delete inquiry
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
function SeoWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = () =>
    api<Row[]>("redirects")
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void api<Row[]>("redirects")
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>SEO & redirects</h1>
      <p className="intro">
        Per-page and per-card metadata are edited with their content. Global
        defaults are in site settings.
      </p>
      <div className="toolbar">
        <Link className="button" href="/admin/pages">
          Page SEO
        </Link>
        <Link className="button" href="/admin/cards">
          Card SEO
        </Link>
        <Link className="button" href="/admin/settings">
          Global SEO
        </Link>
      </div>
      <div className="panel">
        <h2>Create permanent redirect</h2>
        <p className="muted">
          Published slug changes create redirects automatically. Manual
          redirects accept local paths and reject loops.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const values = new FormData(form);
            setError("");
            try {
              await api("redirects", "POST", {
                oldPath: values.get("oldPath"),
                newPath: values.get("newPath"),
              });
              setMessage("Redirect saved.");
              form.reset();
              void load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <div className="grid">
            <label>
              Old path
              <input name="oldPath" placeholder="/old-path" required />
            </label>
            <label>
              New path
              <input name="newPath" placeholder="/topics/new-path" required />
            </label>
          </div>
          <button>Add 301 redirect</button>
        </form>
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
      <div className="panel">
        <h2>Redirect registry</h2>
        {rows.map((row, i) => (
          <p key={String(row.id ?? i)}>
            <code>{String(row.oldPath ?? row.old_path)}</code> →{" "}
            <code>{String(row.newPath ?? row.new_path)}</code>{" "}
            <span className="badge">301</span>
          </p>
        ))}
        {!rows.length && <p>No redirects yet.</p>}
      </div>
    </>
  );
}
