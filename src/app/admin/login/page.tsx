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
      <p className="eyebrow">NLP & HYPNOSIS ACADEMY</p>
      <h1>Maintainer sign in</h1>
      <p>Use your privately configured maintainer account.</p>
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
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
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
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <details>
        <summary>First-time setup</summary>
        <p>
          An operator must run <code>npm run admin:bootstrap</code> with private
          bootstrap credentials. There is no default password or public account
          registration.
        </p>
      </details>
      <Link href="/">Return to public site</Link>
    </main>
  );
}
