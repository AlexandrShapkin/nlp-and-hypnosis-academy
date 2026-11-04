"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/components/admin/api";

export default function InvitationPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const value = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(value)) setToken(value);
    else setError("Ссылка недействительна. Попросите владельца сайта создать новую.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("Пароли не совпадают. Введите одинаковые значения.");
      return;
    }
    setBusy(true);
    try {
      await api("auth/accept-invite", "POST", { token, password });
      window.history.replaceState(null, "", "/admin/invite");
      setCompleted(true);
      setPassword("");
      setConfirmation("");
      setToken("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cms-login">
      <p className="eyebrow">УПРАВЛЕНИЕ САЙТОМ</p>
      <h1>{completed ? "Пароль установлен" : "Приглашение в команду сайта"}</h1>
      {completed ? (
        <>
          <p role="status">
            Теперь вы можете войти в админ-панель с вашей электронной почтой
            и новым паролем.
          </p>
          <Link className="button" href="/admin/login">
            Перейти ко входу
          </Link>
        </>
      ) : (
        <>
          <p>
            Для начала работы установите личный пароль. Никому его не сообщайте.
            Он должен содержать не менее 14 символов.
          </p>
          <form onSubmit={submit}>
            <label>
              Придумайте пароль
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={14}
                maxLength={256}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!token || busy}
              />
            </label>
            <label>
              Повторите пароль
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={14}
                maxLength={256}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={!token || busy}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button disabled={!token || busy}>
              {busy ? "Сохраняем…" : "Установить пароль"}
            </button>
          </form>
        </>
      )}
      <Link href="/">Вернуться на сайт</Link>
    </main>
  );
}
