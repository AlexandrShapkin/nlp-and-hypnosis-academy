"use client";
import { useState, type FormEvent } from "react";
import type { Block } from "@/shared/content";
export function ContactForm({
  block,
  privacyVersion,
}: {
  block: Block;
  privacyVersion: string;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const label = (key: string, fallback: string) =>
    typeof block.data[key] === "string" ? String(block.data[key]) : fallback;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const form = event.currentTarget;
    const d = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: d.get("name"),
          phone: d.get("phone"),
          email: d.get("email"),
          message: d.get("message"),
          privacyConsent: d.get("privacyConsent") === "on",
          marketingConsent: d.get("marketingConsent") === "on",
          privacyVersion,
          website: d.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message || "Не удалось отправить сообщение.",
        );
      setStatus(label("successMessage", "Сообщение отправлено."));
      form.reset();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Не удалось отправить сообщение.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="public-contact-form" onSubmit={submit}>
      <div className="public-form-row">
        <label>
          {label("nameLabel", "Имя")}
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          {label("phoneLabel", "Телефон")}
          <input
            name="phone"
            required
            maxLength={50}
            type="tel"
            autoComplete="tel"
          />
        </label>
      </div>
      <label>
        {label("emailLabel", "Электронная почта")}
        <input name="email" type="email" maxLength={254} autoComplete="email" />
      </label>
      <label>
        {label("messageLabel", "Сообщение")}
        <textarea name="message" rows={3} maxLength={5000} />
      </label>
      <label className="public-honeypot" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="public-check">
        <input name="privacyConsent" type="checkbox" required />
        <span>
          {label(
            "privacyLabel",
            "Я согласен с обработкой персональных данных.",
          )}{" "}
          <a href="/privacy">Политика конфиденциальности</a>
        </span>
      </label>
      <label className="public-check">
        <input name="marketingConsent" type="checkbox" />
        <span>
          {label(
            "marketingLabel",
            "Согласен получать информационные сообщения (необязательно).",
          )}
        </span>
      </label>
      <button className="public-button" disabled={busy} type="submit">
        {busy ? "Отправка…" : label("submitLabel", "Отправить")}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
