import { loginAsMaintainer } from "./login";
import { test, expect } from "@playwright/test";

test("all administration destinations expose Russian headings and interface copy", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Вход в управление сайтом",
  );
  await loginAsMaintainer(page);
  const destinations = [
    ["", "Главная"],
    ["pages", "Страницы сайта"],
    ["cards", "Карточки и материалы"],
    ["media", "Фотографии и файлы"],
    ["navigation", "Меню сайта"],
    ["theme", "Оформление"],
    ["settings", "Настройки сайта"],
    ["leads", "Заявки"],
    ["seo", "Поисковая оптимизация"],
    ["audit", "История изменений"],
  ];
  for (const [route, heading] of destinations) {
    await page.goto(`/admin${route ? `/${route}` : ""}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.locator("body")).not.toContainText(
      /Restricted personal|Maintainer overview|Save draft|Media library|Site settings|Automatic content link|Published cards|Loading|No records|Section ID|revision [0-9]/,
    );
    await expect(page.locator(".cms-sidebar")).toContainText("Выйти");
    if (route === "media")
      await page.screenshot({
        path: testInfo.outputPath("cms-media-library.png"),
        fullPage: true,
      });
  }
});
