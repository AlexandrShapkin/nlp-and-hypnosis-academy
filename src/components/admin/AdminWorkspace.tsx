"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { ContentEditor } from "./ContentEditor";
import { ThemeEditor } from "./ThemeEditor";
import { SettingsEditor } from "./SettingsEditor";
import { NavigationEditor } from "./NavigationEditor";
import { MediaEditor } from "./MediaEditor";
import { TeamEditor } from "./TeamEditor";
import { russianName, russianDate } from "./messages";
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
      ) : route === "team" ? (
        <TeamEditor />
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
      <p className="eyebrow">ВАШ САЙТ</p>
      <h1>Главная</h1>
      <p className="intro">Что вы хотите изменить сегодня?</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="cms-quick-actions">
        {[
          [
            "/admin/pages?home=1",
            "Изменить главную страницу",
            "Заголовки, фотографии и разделы",
          ],
          [
            "/admin/media",
            "Добавить фотографию",
            "Загрузить и использовать на сайте",
          ],
          [
            "/admin/settings#branding",
            "Поменять логотип",
            "Логотипы в шапке и подвале",
          ],
          [
            "/admin/cards?new=service",
            "Добавить услугу",
            "Описание, фотографии и публикация",
          ],
          ["/admin/theme", "Изменить оформление", "Цвета, шрифты и кнопки"],
          ["/", "Посмотреть сайт", "Открыть опубликованную версию"],
        ].map(([href, title, description]) => (
          <Link
            key={href}
            href={href}
            className="panel cms-quick-action"
            target={href === "/" ? "_blank" : undefined}
          >
            <strong>{title} ↗</strong>
            <span className="muted">{description}</span>
          </Link>
        ))}
      </div>
      <div className="grid">
        {Object.entries(counts).map(([key, count]) => (
          <Link className="panel" key={key} href={`/admin/${key}`}>
            <h2>{count}</h2>
            {
              {
                cards: "Карточек и материалов",
                pages: "Страниц сайта",
                leads: "Заявок",
              }[key]
            }
          </Link>
        ))}
      </div>
      <div className="panel notice">
        <h2>Изменения под вашим контролем</h2>
        <p>
          Сначала сохраните изменения, затем откройте предпросмотр. Нажмите
          «Опубликовать», когда всё готово. До публикации посетители видят
          прежнюю версию.
        </p>
        <p className="muted">
          Настройки сайта и меню применяются сразу после сохранения — кнопки на
          этих страницах напоминают об этом.
        </p>
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
    (k) =>
      ![
        "id",
        "actor_id",
        "actorId",
        "entity_id",
        "entityId",
        "ip_hash",
        "ipHash",
        "user_id",
        "userId",
      ].includes(k),
  );
  return (
    <>
      <h1>{kind === "leads" ? "Заявки" : "История изменений"}</h1>
      <p className="intro">
        {kind === "leads"
          ? "Здесь собраны обращения посетителей. Удаляйте заявки, которые больше не нужны."
          : "Здесь видно, когда и какие изменения вносились на сайт."}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="panel table-scroll">
        {!rows.length ? (
          <p>Записей пока нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k}>{russianName(k)}</th>
                ))}
                {kind === "leads" && <th>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  {keys.map((k) => (
                    <td key={k}>
                      {/[dD]ate|[aA]t$|_at$|[uU]ntil$/.test(k)
                        ? russianDate(row[k])
                        : typeof row[k] === "boolean"
                          ? row[k]
                            ? "Да"
                            : "Нет"
                          : typeof row[k] === "object"
                            ? "Изменения сохранены"
                            : k === "action"
                              ? actionLabel(String(row[k]))
                              : k === "entity_type" || k === "entityType"
                                ? {
                                    card: "Материал",
                                    page: "Страница",
                                    theme: "Оформление",
                                    settings: "Настройки",
                                    media: "Изображение",
                                    navigation: "Меню",
                                  }[String(row[k])] || "Сайт"
                                : String(row[k] ?? "—")}
                    </td>
                  ))}
                  {kind === "leads" && (
                    <td>
                      <button
                        className="danger"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Удалить заявку навсегда? Восстановить её не получится.",
                            )
                          )
                            return;
                          try {
                            await api(`leads/${row.id}`, "DELETE");
                            void load();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Удалить заявку
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
      <h1>Поисковая оптимизация</h1>
      <p className="intro">
        Заголовок, описание и изображение для поиска можно изменить в редакторе
        каждой страницы или материала. Общие настройки применяются, если
        отдельные поля не заполнены.
      </p>
      <div className="toolbar">
        <Link className="button" href="/admin/pages">
          Поиск: страницы
        </Link>
        <Link className="button" href="/admin/cards">
          Поиск: материалы
        </Link>
        <Link className="button" href="/admin/settings">
          Общие настройки поиска
        </Link>
      </div>
      <details className="panel">
        <summary>Дополнительно: перенаправления адресов</summary>
        <h2>Перенаправить старый адрес</h2>
        <p className="muted">
          При изменении адреса опубликованной страницы перенаправление создаётся
          автоматически. Дополнительные перенаправления доступны ниже.
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
              setMessage("Перенаправление сохранено.");
              form.reset();
              void load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <div className="grid">
            <label>
              Старый адрес
              <input name="oldPath" placeholder="/old-path" required />
            </label>
            <label>
              Новый адрес
              <input name="newPath" placeholder="/topics/new-path" required />
            </label>
          </div>
          <button>Добавить перенаправление</button>
        </form>
      </details>
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
        <h2>Сохранённые перенаправления</h2>
        {rows.map((row, i) => (
          <p key={String(row.id ?? i)}>
            <code>{String(row.oldPath ?? row.old_path)}</code> →{" "}
            <code>{String(row.newPath ?? row.new_path)}</code>{" "}
            <span className="badge">301</span>
          </p>
        ))}
        {!rows.length && <p>Перенаправлений пока нет.</p>}
      </div>
    </>
  );
}

function actionLabel(action: string) {
  const verb = action.split(".").at(-1) || action;
  return (
    (
      {
        create: "Создание",
        update: "Сохранение изменений",
        save: "Сохранение",
        publish: "Публикация",
        unpublish: "Снятие с публикации",
        delete: "Удаление",
        archive: "Удаление материала",
        upload: "Загрузка изображения",
        login: "Вход",
        logout: "Выход",
        restore: "Восстановление версии",
        invite: "Приглашение мейнтейнера",
        accept: "Принятие приглашения",
        activate: "Восстановление доступа",
        deactivate: "Отключение доступа",
        revoke: "Отзыв приглашения",
        reset_link: "Ссылка восстановления пароля",
        password_reset: "Смена пароля",
      } as Record<string, string>
    )[verb] || "Изменение сайта"
  );
}
