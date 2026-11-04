"use client";
import { useEffect, useState } from "react";
import { settingsSchema, type Settings, type MediaAsset } from "@/shared/content";
import { MediaPicker } from "./MediaPicker";
import { api } from "./api";
import { Field, SeoFields, errorMessage } from "./fields";
type TextSetting = Exclude<keyof Settings, "seo" | "logoImageId" | "footerLogoImageId" | "faviconImageId">;
const labels: Record<TextSetting, string> = {
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
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const onUploaded = (asset: MediaAsset) => setMedia((items) => [...items, asset]);
  useEffect(() => {
    void api<MediaAsset[]>("media").then((r) => setMedia(r.data)).catch((e) => setError(errorMessage(e)));
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
                value={draft[key as TextSetting]}
                multiline={["description", "footerText", "legalText"].includes(
                  key,
                )}
                onChange={(value) => setDraft({ ...draft, [key]: value })}
              />
            ))}
          </div>
          <div className="cms-brand-settings">
            <h2>Brand images</h2>
            <p className="muted">Choose brand images from the library or upload them here. The header and footer can use different versions for light and dark backgrounds. Text branding remains a fallback.</p>
            <MediaPicker
              label="Header logo"
              value={draft.logoImageId ? [draft.logoImageId] : []}
              media={media}
              onUploaded={onUploaded}
              onChange={(ids) => setDraft({ ...draft, logoImageId: ids[0] })}
              hint="Recommended: horizontal logo or transparent symbol with good contrast on light backgrounds."
            />
            <MediaPicker
              label="Footer logo"
              value={draft.footerLogoImageId ? [draft.footerLogoImageId] : []}
              media={media}
              onUploaded={onUploaded}
              onChange={(ids) => setDraft({ ...draft, footerLogoImageId: ids[0] })}
              hint="Optional alternative for the dark footer. If empty, the original brand symbol remains."
            />
            <MediaPicker
              label="Browser tab icon (favicon)"
              value={draft.faviconImageId ? [draft.faviconImageId] : []}
              media={media}
              onUploaded={onUploaded}
              onChange={(ids) => setDraft({ ...draft, faviconImageId: ids[0] })}
              hint="Square image recommended. The app serves uploaded images as optimized WebP."
            />
          </div>
          <SeoFields
            seo={draft.seo}
            onChange={(seo) => setDraft({ ...draft, seo })}
            media={media}
            onUploaded={onUploaded}
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
