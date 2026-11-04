"use client";
import { useEffect, useState } from "react";
import { settingsSchema, type Settings } from "@/shared/content";
import { api } from "./api";
import { Field, SeoFields, errorMessage } from "./fields";
const labels: Record<Exclude<keyof Settings, "seo">, string> = {
  siteTitle: "Site title",
  description: "Site description",
  brandLabel: "Header brand label",
  phone: "Contact phone",
  email: "Contact email",
  bookingLabel: "Booking button label",
  bookingUrl: "Booking destination",
  footerText: "Footer text",
  legalText: "Legal identity & disclosures",
  privacyVersion: "Privacy policy version",
  socialUrl: "Social link",
};
export function SettingsEditor() {
  const [draft, setDraft] = useState<Settings | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<Settings>("settings")
      .then((r) => {
        setDraft(r.data);
        setVersion(r.version ?? 1);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <>
      <h1>Site settings</h1>
      <p className="intro">
        Global brand, contact, legal, booking, and search defaults. Saving
        settings applies these values to the public site.
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
              setVersion(result.version ?? version + 1);
              setMessage("Settings saved.");
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid">
            {Object.entries(labels).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={draft[key as Exclude<keyof Settings, "seo">]}
                multiline={["description", "footerText", "legalText"].includes(
                  key,
                )}
                onChange={(value) => setDraft({ ...draft, [key]: value })}
              />
            ))}
          </div>
          <SeoFields
            seo={draft.seo}
            onChange={(seo) => setDraft({ ...draft, seo })}
          />
          <button disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
          <p className="muted">
            Edit privacy and terms content in Pages & sections. Increment the
            privacy policy version when consent language changes.
          </p>
        </form>
      ) : (
        <p>Loading settings…</p>
      )}
    </>
  );
}
