import { loginAsMaintainer } from "./login";
import { test, expect, type Page } from "@playwright/test";
const origin = "http://localhost:8080";
async function login(page: Page) {
  await loginAsMaintainer(page);
}
test("SSR, private routes, SEO and responsive navigation", async ({
  page,
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('lang="ru"');
  expect(html).toContain('rel="canonical"');
  expect(html).toContain("og:title");
  expect(html).not.toMatch(/TODO|password_hash|token_hash/);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect(
    (
      await request.post("/api/admin/cards", {
        data: { title: "intruder", slug: "intruder" },
        headers: { Origin: origin, "x-requested-with": "CMS" },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
    if (width === 375) {
      await page.getByLabel("Открыть меню", { exact: true }).click();
      await expect(
        page.getByRole("navigation", {
          name: "Мобильная навигация",
          exact: true,
        }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
});
test("maintainer creates, previews, publishes, renames and unpublishes a card", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/admin/cards");
  const slug = `browser-topic-${Date.now()}`;
  const title = "Проверка публикации браузером";
  await page
    .getByRole("button", { name: "Создать карточку", exact: true })
    .click();
  await page.getByLabel("Название", { exact: true }).fill(title);
  await page.getByText("Дополнительные настройки", { exact: true }).click();
  await page.getByLabel("Адрес страницы", { exact: true }).fill(slug);
  await page
    .getByLabel("Подробное описание", { exact: true })
    .fill("Оригинальный текст для проверки редактора.");
  await expect(
    page.getByLabel("Показывать в меню", { exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await expect(page.locator(".notice[role=status]")).toContainText("сохранены");
  expect((await request.get(`/topics/${slug}`)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    `/topics/${slug}`,
  );
  const previewPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Предпросмотр", exact: true }).click();
  const preview = await previewPromise;
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(title);
  await preview.close();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "Опубликовано",
  );
  expect((await request.get(`/topics/${slug}`)).status()).toBe(200);
  expect(await (await request.get("/")).text()).toContain(`/topics/${slug}`);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    `/topics/${slug}`,
  );
  const renamed = `${slug}-renamed`;
  await page.getByLabel("Адрес страницы", { exact: true }).fill(renamed);
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await expect(page.locator(".notice[role=status]")).toContainText("сохранены");
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "Опубликовано",
  );
  const alias = await request.get(`/topics/${slug}`, { maxRedirects: 0 });
  expect(alias.status()).toBe(301);
  expect(alias.headers().location).toContain(`/topics/${renamed}`);
  await page
    .getByRole("button", { name: "Снять с публикации", exact: true })
    .click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "снят с публикации",
  );
  expect((await request.get(`/topics/${renamed}`)).status()).toBe(404);
  expect(await (await request.get("/")).text()).not.toContain(
    `/topics/${renamed}`,
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    `/topics/${renamed}`,
  );
});
test("contact consent validation and acceptance", async ({ request }) => {
  const fields = {
    name: "Проверка",
    phone: "+79990000000",
    email: "",
    message: "Тестовое обращение",
    privacyVersion: "1",
    marketingConsent: false,
    website: "",
  };
  expect(
    (
      await request.post("/api/contact", {
        data: { ...fields, privacyConsent: false },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await request.post("/api/contact", {
        data: { ...fields, privacyConsent: true },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(201);
});
test("theme draft, publication and rollback change public CSS only explicitly", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/admin/theme");
  await expect(
    page.getByLabel("Основной цвет: код цвета", { exact: true }),
  ).toBeVisible();
  const oldColor = await page
    .getByLabel("Основной цвет: код цвета", { exact: true })
    .inputValue();
  const newColor = oldColor === "#304e7a" ? "#285044" : "#304e7a";
  page.on("dialog", (d) => d.accept());
  await page
    .getByLabel("Основной цвет: код цвета", { exact: true })
    .fill(newColor);
  await page
    .getByRole("button", { name: "Сохранить оформление", exact: true })
    .click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "сохранено в черновик",
  );
  expect(await (await request.get("/")).text()).toContain(
    `--color-primary:${oldColor}`,
  );
  await page.screenshot({ path: "test-results/cms-theme.png", fullPage: true });
  await page
    .getByRole("button", { name: "Опубликовать оформление", exact: true })
    .click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "Оформление опубликовано",
  );
  expect(await (await request.get("/")).text()).toContain(
    `--color-primary:${newColor}`,
  );
  await page
    .getByRole("button", { name: "Восстановить эту версию", exact: true })
    .nth(1)
    .click();
  await expect(page.locator(".notice[role=status]")).toContainText(
    "Прежнее оформление восстановлено",
  );
  expect(await (await request.get("/")).text()).toContain(
    `--color-primary:${oldColor}`,
  );
});

test("new runtime uploads are immediately public in production", async ({
  page,
}) => {
  await login(page);
  const { default: sharp } = await import("sharp");
  const png = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#255e50" },
  })
    .png()
    .toBuffer();
  const headers = { Origin: origin, "x-requested-with": "CMS" };
  const upload = await page.request.post("/api/admin/media", {
    headers,
    multipart: {
      file: {
        name: "../../safe-image.png",
        mimeType: "image/png",
        buffer: png,
      },
      alt: "Проверка безопасного изображения",
    },
  });
  expect(upload.status()).toBe(201);
  const { data: asset } = await upload.json();
  try {
    const response = await page.request.get(asset.url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/webp");
    expect((await response.body()).subarray(8, 12).toString()).toBe("WEBP");
  } finally {
    expect(
      (
        await page.request.delete(`/api/admin/media/${asset.id}`, { headers })
      ).ok(),
    ).toBe(true);
  }
});
