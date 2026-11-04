import { russianName } from "./messages";
export class CmsRequestError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "CmsRequestError";
  }
}
export type Reply<T> = { data: T; version?: number };
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Reply<T>> {
  const multipart = body instanceof FormData;
  const response = await fetch(`/api/admin/${path}`, {
    method,
    cache: "no-store",
    headers: {
      "x-requested-with": "CMS",
      ...(body && !multipart ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
  }).catch(() => {
    throw new Error(
      "Не удалось связаться с сайтом. Проверьте соединение и повторите попытку.",
    );
  });
  const result = await response.json().catch(() => {
    throw new Error("Сайт временно недоступен. Повторите попытку позже.");
  });
  if (!response.ok) {
    const fields = result.error?.fields as
      | Record<string, string[] | undefined>
      | undefined;
    const details = fields
      ? Object.entries(fields)
          .filter(([, messages]) => messages?.length)
          .map(
            ([field]) =>
              `${russianName(field.split(".").at(-1) || field)}: проверьте значение`,
          )
          .join("; ")
      : "";
    throw new CmsRequestError(
      `${translateError(result.error?.message, response.status)}${details ? `: ${details}` : ""}`,
      fields
        ? Object.fromEntries(
            Object.entries(fields).map(([key, values]) => [key, values || []]),
          )
        : {},
    );
  }
  return result as Reply<T>;
}

function translateError(message: unknown, status: number) {
  const text = typeof message === "string" ? message : "";
  if (/[а-яё]/i.test(text)) return text;
  if (status === 401)
    return "Не удалось войти. Проверьте почту и пароль. Если вы уже вошли, войдите ещё раз.";
  if (status === 403)
    return "Нет доступа к этому действию. Обновите страницу и войдите снова.";
  if (status === 409)
    return /referenc|used|media/i.test(text)
      ? "Изображение используется на сайте или в черновике. Сначала уберите его из материалов и настроек."
      : /slug|address/i.test(text)
        ? "Такой адрес уже занят. Выберите другой в дополнительных настройках."
        : "Материал изменился в другом окне. Обновите страницу перед сохранением.";
  if (status === 413 || /size|large|5 MB/i.test(text))
    return "Файл слишком большой. Выберите изображение до 5 МБ.";
  if (status === 429)
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  if (/contrast/i.test(text))
    return "Выбранные цвета плохо различимы. Сделайте текст темнее или фон светлее.";
  if (/referenc|in use/i.test(text))
    return "Изображение используется на сайте или в черновике. Сначала уберите его из материалов и настроек.";
  if (/image|file|format|upload/i.test(text))
    return "Не удалось загрузить изображение. Используйте JPEG, PNG или WebP до 5 МБ.";
  if (status === 404) return "Материал не найден. Обновите страницу.";
  if (status === 400 || status === 422)
    return "Не удалось сохранить. Проверьте заполненные поля и обязательные данные.";
  return "Не удалось выполнить действие. Повторите попытку.";
}
