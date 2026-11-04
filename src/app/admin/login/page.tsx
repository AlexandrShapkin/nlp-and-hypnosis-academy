"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/admin/api";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="cms-login">
      <p className="eyebrow">АКАДЕМИЯ НЛП И ГИПНОЗА</p>
      <h1>Вход в управление сайтом</h1>
      <p>Введите электронную почту и пароль вашей учётной записи.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fields = new FormData(e.currentTarget);
          try {
            await api("auth/login", "POST", {
              email: fields.get("email"),
              password: fields.get("password"),
            });
            router.push("/admin");
            router.refresh();
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Электронная почта
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Пароль
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button disabled={busy}>{busy ? "Входим…" : "Войти"}</button>
      </form>
      <details>
        <summary>Нет доступа?</summary>
        <p>
          Попросите владельца сайта создать для вас учётную запись или
          восстановить доступ.
        </p>
      </details>
      <Link href="/">Вернуться на сайт</Link>
    </main>
  );
}
