"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "./api";
import { russianDate } from "./messages";

type Member = {
  id: string;
  email: string;
  role: "owner" | "maintainer";
  active: number;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  kind: "invite" | "reset";
  expiresAt: number;
  createdAt: string;
};

type Team = { members: Member[]; invitations: Invitation[] };
type LinkResponse = { email: string; token: string; expiresAt: number };

export function TeamEditor() {
  const [team, setTeam] = useState<Team>({ members: [], invitations: [] });
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [linkFor, setLinkFor] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await api<Team>("team");
    setTeam(result.data);
  }, []);

  useEffect(() => {
    let mounted = true;
    api<Team>("team")
      .then((result) => {
        if (mounted) setTeam(result.data);
      })
      .catch((error: Error) => {
        if (mounted) setError(error.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function showLink(result: LinkResponse, description: string) {
    // Never persist a cleartext token: display it only in the owner's current session.
    setLink(window.location.origin + "/admin/invite#" + result.token);
    setLinkFor(result.email);
    setMessage(description);
  }

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    setLink("");
    try {
      await action();
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invitedEmail = email.trim();
    await perform(async () => {
      const response = await api<LinkResponse>("team/invite", "POST", {
        email: invitedEmail,
      });
      showLink(
        response.data,
        "Ссылка создана. Передайте её будущему мейнтейнеру лично. Срок действия — 48 часов.",
      );
      setEmail("");
    });
  }

  return (
    <>
      <h1>Мейнтейнеры сайта</h1>
      <p className="intro">
        Здесь владелец сайта может приглашать людей в админ-панель, отключать
        доступ и помогать восстановить пароль.
      </p>
      <div className="panel">
        <h2>Пригласить мейнтейнера</h2>
        <p className="muted">
          У нового мейнтейнера будет доступ к управлению сайтом, но не к
          управлению другими учётными записями. Приглашённый сам задаст пароль.
          Письма не отправляются автоматически.
        </p>
        <form onSubmit={invite}>
          <label>
            Электронная почта нового мейнтейнера
            <input
              type="email"
              autoComplete="off"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              disabled={busy}
            />
          </label>
          <button type="submit" disabled={busy}>
            Создать ссылку-приглашение
          </button>
        </form>
      </div>

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
      {link && (
        <div className="panel cms-team-link">
          <h2>Одноразовая ссылка для {linkFor}</h2>
          <p className="muted">
            Скопируйте ссылку сейчас и передайте адресату по защищённому каналу.
            После закрытия страницы её нельзя будет посмотреть повторно, но
            можно создать новую.
          </p>
          <label>
            Ссылка для входа
            <input
              aria-label="Ссылка для входа"
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <div className="toolbar">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMessage("Ссылка скопирована.");
                } catch {
                  setError("Выделите ссылку в поле и скопируйте её вручную.");
                }
              }}
            >
              Скопировать ссылку
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setLink("")}
            >
              Скрыть ссылку
            </button>
          </div>
        </div>
      )}

      <div className="panel table-scroll">
        <h2>Учётные записи</h2>
        {loading ? (
          <p>Загружаем список…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Электронная почта</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Создана</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((member) => (
                <tr key={member.id}>
                  <td>{member.email}</td>
                  <td>{member.role === "owner" ? "Владелец" : "Мейнтейнер"}</td>
                  <td>{member.active ? "Активен" : "Отключён"}</td>
                  <td>{russianDate(member.createdAt)}</td>
                  <td>
                    {member.role === "owner" ? (
                      <span className="muted">Защищённая учётная запись</span>
                    ) : (
                      <div className="cms-team-actions">
                        <button
                          type="button"
                          disabled={busy}
                          className={member.active ? "danger" : "secondary"}
                          onClick={() => {
                            if (
                              member.active &&
                              !window.confirm(
                                "Отключить доступ? Все действующие сеансы мейнтейнера будут завершены.",
                              )
                            )
                              return;
                            void perform(async () => {
                              await api("team/" + member.id, "PATCH", {
                                active: !member.active,
                              });
                              setMessage(
                                member.active
                                  ? "Доступ отключён. Все сеансы завершены."
                                  : "Доступ восстановлен.",
                              );
                            });
                          }}
                        >
                          {member.active ? "Отключить" : "Восстановить"}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            if (
                              !window.confirm(
                                "Создать ссылку для установки нового пароля? Старая ссылка восстановления перестанет работать.",
                              )
                            )
                              return;
                            void perform(async () => {
                              const response = await api<LinkResponse>(
                                "team/reset/" + member.id,
                                "POST",
                                {},
                              );
                              showLink(
                                response.data,
                                "Ссылка для установки нового пароля создана. Передайте её мейнтейнеру. Срок действия — 48 часов.",
                              );
                            });
                          }}
                        >
                          Сбросить пароль
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel table-scroll">
        <h2>Неиспользованные ссылки</h2>
        {!team.invitations.length ? (
          <p>Действующих приглашений и ссылок восстановления нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Для кого</th>
                <th>Назначение</th>
                <th>Срок действия</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {team.invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>
                    {invitation.kind === "reset"
                      ? "Восстановление пароля"
                      : "Приглашение"}
                  </td>
                  <td>
                    {invitation.expiresAt < Date.now()
                      ? "Срок истёк"
                      : russianDate(invitation.expiresAt)}
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={busy}
                      className="secondary"
                      onClick={() => {
                        if (!window.confirm("Отозвать эту ссылку?")) return;
                        void perform(async () => {
                          await api(
                            "team/invitations/" + invitation.id,
                            "DELETE",
                          );
                          setMessage("Ссылка отозвана.");
                        });
                      }}
                    >
                      Отозвать ссылку
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
