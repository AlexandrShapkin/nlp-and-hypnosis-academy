import { z } from "zod";

const messages: Record<string, string> = {
  "Revision conflict":
    "Эти данные уже изменены. Обновите страницу перед сохранением.",
  "Content not found": "Материал не найден. Возможно, он уже удалён.",
  "Section keys and IDs must be unique within a page":
    "На странице есть повторяющиеся разделы. Создайте копию раздела заново.",
  "Slug already in use":
    "Этот адрес уже занят. Укажите другой адрес в дополнительных настройках.",
  "Slug is reserved by a redirect":
    "Этот адрес уже используется для перенаправления. Выберите другой.",
  "Homepage slug cannot be changed": "Адрес главной страницы нельзя изменить.",
  "Homepage cannot be removed": "Главную страницу нельзя удалить.",
  "Published contact forms require the canonical privacy page; hide those forms before removing or renaming it":
    "Сначала скройте и опубликуйте формы обратной связи, затем измените страницу политики конфиденциальности.",
  "Publish the canonical privacy page before publishing a contact form":
    "Перед публикацией формы опубликуйте страницу политики конфиденциальности.",
  "All referenced images need alternative text":
    "Выберите существующие фотографии и заполните их описания в разделе «Фотографии и файлы».",
  "Choose a visible homepage section":
    "Выберите видимый раздел главной страницы.",
  "Theme colors need accessible contrast":
    "Текст недостаточно хорошо виден. Выберите более контрастные цвета текста и фона.",
  "Theme revision not found": "Сохранённое оформление не найдено.",
  "Run database seed":
    "Начальная настройка сайта не завершена. Обратитесь к администратору.",
  "Choose an existing image from the media library":
    "Выберите существующее изображение из раздела «Фотографии и файлы».",
  "Redirect loop":
    "Перенаправление возвращает посетителя на тот же адрес. Выберите другой адрес.",
  "Redirect chain too long":
    "Слишком много последовательных перенаправлений. Укажите конечный адрес.",
  "Request is too large":
    "Файл слишком большой. Выберите изображение размером до 5 МБ.",
  "Untrusted request origin":
    "Не удалось проверить безопасность запроса. Обновите страницу и повторите действие.",
  "Missing request protection": "Обновите страницу и повторите действие.",
  "Authentication required": "Войдите в панель управления, чтобы продолжить.",
  "Invalid email or password": "Неверная электронная почта или пароль.",
  "Please try again later":
    "Слишком много попыток. Подождите немного и повторите.",
  "Unsupported method": "Это действие недоступно.",
  "Navigation requires published content":
    "Для меню выберите опубликованную страницу или материал.",
  "Source path has published content":
    "По этому адресу уже опубликована страница. Выберите другой исходный адрес.",
  "Image must be between 1 byte and 5 MB":
    "Выберите непустое изображение размером до 5 МБ.",
  "PNG, JPEG and WebP only":
    "Загрузите изображение в формате PNG, JPEG или WebP.",
  "Invalid image signature":
    "Файл не похож на изображение. Выберите другой файл PNG, JPEG или WebP.",
  "Invalid or oversized image":
    "Не удалось открыть изображение. Выберите другой файл размером до 24 миллионов пикселей.",
  "Media not found": "Изображение не найдено. Обновите список фотографий.",
  "Media is in use by site content or settings. Remove the reference before deleting.":
    "Изображение используется на сайте или в сохранённых изменениях. Сначала уберите его со страниц, карточек и из настроек, затем опубликуйте изменения.",
  "Endpoint not found": "Запрошенное действие не найдено.",
  "Only the owner can manage maintainers": "Управлять мейнтейнерами может только владелец сайта.",
  "An account with this email already exists": "Пользователь с такой электронной почтой уже существует. Если доступ отключён, восстановите его в списке.",
  "Invitation is invalid or expired": "Ссылка недействительна, уже использована или срок её действия истёк. Попросите владельца создать новую.",
  "Maintainer not found": "Мейнтейнер не найден. Обновите список.",
  "You cannot disable your own account": "Нельзя отключить собственную учётную запись.",
  "Owner accounts cannot be disabled": "Учётную запись владельца нельзя отключить через админ-панель.",
  "Owner password cannot be reset by another user": "Пароль владельца нельзя изменить через управление командой.",
  "Invitation not found": "Ссылка уже использована, отозвана или не найдена.",
};
export function adminErrorMessage(message: string): string {
  if (messages[message]) return messages[message];
  const section = /^Section (.+) requires (.+)$/.exec(message);
  if (section) {
    const labels: Record<string, string> = {
      "a heading": "заголовок",
      "body text": "текст",
      "a CTA label": "текст кнопки",
      "a safe CTA destination": "безопасную ссылку для кнопки",
      "a submit label": "текст кнопки отправки",
    };
    return `В разделе «${section[1]}» заполните ${labels[section[2]] || "обязательные поля"}.`;
  }
  if (message.startsWith("Section is used by published navigation:"))
    return "Раздел используется в опубликованном меню. Сначала измените ссылки на него.";
  // Never leak database details or untranslated technical errors to beginners.
  return /[А-Яа-яЁё]/.test(message)
    ? message
    : "Не удалось выполнить действие. Проверьте данные и повторите попытку.";
}
export function adminValidationFields(
  error: z.ZodError,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    let message = "Проверьте значение этого поля.";
    if (/[А-Яа-яЁё]/.test(issue.message)) message = issue.message;
    else if (issue.code === "too_small")
      message = "Заполните поле: значение слишком короткое или маленькое.";
    else if (issue.code === "too_big")
      message = "Сократите значение: превышен допустимый размер.";
    else if (issue.path.at(-1) === "email")
      message = "Укажите электронную почту, например name@example.ru.";
    else if (issue.path.at(-1) === "slug")
      message = "Используйте латинские буквы, цифры и дефисы без пробелов.";
    else if (issue.code === "invalid_format")
      message = "Проверьте формат значения.";
    (fields[key] ??= []).push(message);
  }
  return fields;
}
