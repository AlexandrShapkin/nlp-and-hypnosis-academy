import { test, expect, type Page } from "@playwright/test";
const origin = "http://localhost:8080";
async function login(page: Page) {
  await page.goto("/admin/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.TEST_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
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
  await page.getByRole("button", { name: "New card", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page
    .getByLabel("Body text", { exact: true })
    .fill("Оригинальный текст для проверки редактора.");
  await expect(
    page.getByLabel("Add to main navigation", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  expect((await request.get(`/topics/${slug}`)).status()).toBe(404);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    `/topics/${slug}`,
  );
  await page
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();
  await expect(page.getByLabel("Private draft preview")).toContainText(title);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Published successfully",
  );
  expect((await request.get(`/topics/${slug}`)).status()).toBe(200);
  expect(await (await request.get("/")).text()).toContain(`/topics/${slug}`);
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    `/topics/${slug}`,
  );
  const renamed = `${slug}-renamed`;
  await page.getByLabel("Slug", { exact: true }).fill(renamed);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Published successfully",
  );
  const alias = await request.get(`/topics/${slug}`, { maxRedirects: 0 });
  expect(alias.status()).toBe(301);
  expect(alias.headers().location).toContain(`/topics/${renamed}`);
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("unpublished");
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
    page.getByLabel("primary hex color", { exact: true }),
  ).toBeVisible();
  const oldColor = await page
    .getByLabel("primary hex color", { exact: true })
    .inputValue();
  const newColor = oldColor === "#304e7a" ? "#285044" : "#304e7a";
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("primary hex color", { exact: true }).fill(newColor);
  await page
    .getByRole("button", { name: "Save theme draft", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Theme draft saved");
  expect(await (await request.get("/")).text()).toContain(
    `--color-primary:${oldColor}`,
  );
  await page
    .getByRole("button", { name: "Publish theme", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Theme published");
  expect(await (await request.get("/")).text()).toContain(
    `--color-primary:${newColor}`,
  );
  await page
    .getByRole("button", { name: "Restore version", exact: true })
    .nth(1)
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Previous theme restored",
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
