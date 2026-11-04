import { loginAsMaintainer } from "./login";
import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import sharp from "sharp";
import type {
  Entity,
  MediaAsset,
  PageDraft,
  Settings,
} from "../../src/shared/content";

const headers = { Origin: "http://localhost:8080", "x-requested-with": "CMS" };

async function login(page: Page) {
  await loginAsMaintainer(page);
  page.on("dialog", (dialog) => dialog.accept());
}

async function homeEntity(request: APIRequestContext) {
  const response = await request.get("/api/admin/pages");
  expect(response.ok()).toBe(true);
  const pages: Entity<PageDraft>[] = (await response.json()).data;
  const home = pages.find((entity) => entity.draft.slug === "home");
  expect(home).toBeDefined();
  return home!;
}

async function openHomepage(page: Page, home: Entity<PageDraft>) {
  await page.goto("/admin/pages");
  await page
    .locator(".entity-button")
    .filter({ hasText: home.draft.title })
    .click();
  await expect(page.getByLabel("Название", { exact: true })).toHaveValue(
    home.draft.title,
  );
}

async function save(page: Page) {
  await page
    .getByRole("button", { name: "Сохранить изменения", exact: true })
    .click();
  await expect(
    page.locator('p[role="status"]').filter({ hasText: "сохранены" }),
  ).toBeVisible();
}

async function publish(page: Page) {
  await page.getByRole("button", { name: "Опубликовать", exact: true }).click();
  await expect(
    page.locator('p[role="status"]').filter({ hasText: "Опубликовано" }),
  ).toBeVisible();
}

async function restoreHome(
  request: APIRequestContext,
  original: Entity<PageDraft>,
) {
  let current = await homeEntity(request);
  if (original.published) {
    const saved = await request.patch(`/api/admin/pages/${original.id}`, {
      headers,
      data: { ...original.published, version: current.version },
    });
    expect(saved.ok()).toBe(true);
    current = (await saved.json()).data;
    const published = await request.post(
      `/api/admin/pages/${original.id}/publish`,
      {
        headers,
        data: { version: current.version },
      },
    );
    expect(published.ok()).toBe(true);
    current = (await published.json()).data;
  }
  const restored = await request.patch(`/api/admin/pages/${original.id}`, {
    headers,
    data: { ...original.draft, version: current.version },
  });
  expect(restored.ok()).toBe(true);
}

async function uploadPhotos(
  request: APIRequestContext,
  count: number,
  prefix: string,
) {
  const assets: MediaAsset[] = [];
  for (let i = 0; i < count; i++) {
    const buffer = await sharp({
      create: {
        width: 160,
        height: 120,
        channels: 3,
        background: { r: 40 + i * 30, g: 110, b: 90 },
      },
    })
      .png()
      .toBuffer();
    const response = await request.post("/api/admin/media", {
      headers,
      multipart: {
        file: { name: `cms-journey-${i}.png`, mimeType: "image/png", buffer },
        alt: `${prefix} ${i + 1}`,
        caption: `Подпись к фотографии ${i + 1}`,
      },
    });
    expect(response.status()).toBe(201);
    assets.push((await response.json()).data);
  }
  return assets;
}

async function removePhotos(request: APIRequestContext, assets: MediaAsset[]) {
  for (const asset of assets) {
    const response = await request.delete(`/api/admin/media/${asset.id}`, {
      headers,
    });
    expect(response.ok()).toBe(true);
  }
}

test("Russian dashboard offers understandable tasks and works on a narrow screen", async ({
  page,
}, testInfo) => {
  await login(page);
  for (const label of [
    "Изменить главную страницу",
    "Добавить фотографию",
    "Поменять логотип",
    "Добавить услугу",
    "Изменить оформление",
    "Посмотреть сайт",
  ]) {
    await expect(
      page
        .locator(".cms-quick-actions")
        .getByRole("link", { name: new RegExp(label) }),
    ).toBeVisible();
  }
  await expect(page.locator("body")).not.toContainText(
    /Maintainer overview|Save draft|Media library|Site settings/,
  );
  await page.screenshot({
    path: testInfo.outputPath("cms-dashboard-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /Изменить главную страницу/ }).click();
  await expect(
    page.getByRole("heading", { name: "Страницы сайта", exact: true }),
  ).toBeVisible();
  const home = await homeEntity(page.request);
  // The quick action should select the homepage; selecting it again is harmless.
  await page
    .locator(".entity-button")
    .filter({ hasText: home.draft.title })
    .click();
  await expect(
    page.getByRole("button", { name: "Сохранить изменения", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("cms-page-editor-mobile.png"),
    fullPage: true,
  });
});

test("homepage changes and basic SEO stay private until explicit publication", async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  const original = await homeEntity(page.request);
  const hero = original.draft.sections.find(
    (section) => section.type === "hero",
  );
  expect(hero).toBeDefined();
  const marker = `Новый заголовок ${Date.now()}`;
  const bodyText = `Описание первого экрана ${Date.now()}`;
  const seoTitle = `Заголовок для поиска ${Date.now()}`;
  const seoDescription =
    "Понятное описание страницы для посетителей поисковых систем.";
  const assets = await uploadPhotos(
    page.request,
    1,
    `Изображение для поиска ${Date.now()}`,
  );
  try {
    await openHomepage(page, original);
    const section = page
      .locator("details.section-box")
      .filter({ has: page.getByLabel("Заголовок раздела", { exact: true }) })
      .filter({ hasText: hero!.heading })
      .first();
    await section.locator("summary").first().click();
    await section
      .getByRole("textbox", { name: "Текст раздела", exact: true })
      .fill(bodyText);
    await section.getByLabel("Заголовок раздела", { exact: true }).fill(marker);
    await page
      .getByText("Как страница выглядит в поиске", { exact: true })
      .click();
    await page
      .getByLabel("Заголовок для поисковых систем", { exact: true })
      .fill(seoTitle);
    await page
      .getByLabel("Описание страницы", { exact: true })
      .fill(seoDescription);
    const seoPicker = page
      .locator(".cms-media-picker")
      .filter({ hasText: "Изображение для социальных сетей" });
    await seoPicker
      .getByRole("button", { name: "Выбрать изображение", exact: true })
      .click();
    await seoPicker
      .locator(".cms-picker-option")
      .filter({ hasText: assets[0].alt })
      .click();
    await save(page);
    const before = await (await page.request.get("/")).text();
    expect(before).not.toContain(marker);
    expect(before).not.toContain(bodyText);
    expect(before).not.toContain(seoTitle);
    const previewLink = page.locator(
      `a[href="/admin/preview/pages/${original.id}"]`,
    );
    const preview = await page.context().newPage();
    await preview.goto((await previewLink.getAttribute("href"))!);
    await expect(
      preview.getByRole("heading", { name: marker, exact: true }),
    ).toBeVisible();
    await expect(preview.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(preview.locator(".public-hero")).toContainText(bodyText);
    await preview.close();
    await publish(page);
    const published = await page.context().newPage();
    await published.goto("/");
    await expect(published.getByRole("heading", { level: 1 })).toHaveText(
      marker,
    );
    await expect(published.locator(".public-hero")).toContainText(bodyText);
    await expect(published).toHaveTitle(seoTitle);
    await expect(published.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      seoDescription,
    );
    expect(
      await published
        .locator('meta[property="og:image"]')
        .getAttribute("content"),
    ).toContain(assets[0].url);
    await published.close();
  } finally {
    await restoreHome(page.request, original);
    await removePhotos(page.request, assets);
  }
});

test("separate header logo, footer logo and favicon can be selected visually", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await login(page);
  const settingsResponse = await page.request.get("/api/admin/settings");
  expect(settingsResponse.ok()).toBe(true);
  const original: Settings = (await settingsResponse.json()).data;
  const assets = await uploadPhotos(
    page.request,
    3,
    `Оформление сайта ${Date.now()}`,
  );
  try {
    await page.goto("/admin/settings");
    const labels = [
      "Логотип в шапке сайта",
      "Логотип в подвале сайта",
      "Иконка сайта",
    ];
    for (let index = 0; index < labels.length; index++) {
      const picker = page
        .locator(".cms-media-picker")
        .filter({ hasText: labels[index] });
      await picker
        .getByRole("button", { name: "Выбрать изображение", exact: true })
        .click();
      await picker
        .locator(".cms-picker-option")
        .filter({ hasText: assets[index].alt })
        .click();
      await expect(picker.locator(".cms-selected-item img")).toHaveAttribute(
        "src",
        assets[index].url,
      );
    }
    await page.screenshot({
      path: testInfo.outputPath("cms-branding.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: /Сохранить.*настройки/ }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Настройки сохранены" }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.locator(".public-header .public-brand img"),
    ).toHaveAttribute("src", assets[0].url);
    await expect(
      page.locator(".public-footer .public-brand img"),
    ).toHaveAttribute("src", assets[1].url);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      assets[2].url,
    );
  } finally {
    const current = await (
      await page.request.get("/api/admin/settings")
    ).json();
    const restored = await page.request.patch("/api/admin/settings", {
      headers,
      data: { ...original, version: current.version },
    });
    expect(restored.ok()).toBe(true);
    await removePhotos(page.request, assets);
  }
});

test("a gallery template supports selecting five photos, changing image order and moving the section", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await login(page);
  const original = await homeEntity(page.request);
  const marker = `Галерея занятий ${Date.now()}`;
  const assets = await uploadPhotos(
    page.request,
    5,
    `Фото для галереи ${Date.now()}`,
  );
  try {
    await openHomepage(page, original);
    await page
      .getByLabel("Шаблон нового раздела", { exact: true })
      .selectOption({ label: "Фотогалерея" });
    await page
      .getByRole("button", { name: "Добавить раздел", exact: true })
      .click();
    const section = page.locator(".cms-section-card").last();
    await section.locator("summary").first().click();
    await section.getByLabel("Заголовок раздела", { exact: true }).fill(marker);
    const picker = section
      .locator(".cms-media-picker")
      .filter({ hasText: "Фотографии галереи" });
    await picker
      .getByRole("button", { name: "Добавить фотографии", exact: true })
      .click();
    for (const asset of assets) {
      await picker
        .locator(".cms-picker-option")
        .filter({ hasText: asset.alt })
        .click();
    }
    await picker
      .getByRole("button", { name: "Закрыть библиотеку", exact: true })
      .click();
    await expect(picker.locator(".cms-selected-item")).toHaveCount(5);
    await picker
      .locator(".cms-selected-item")
      .last()
      .getByRole("button", { name: `Выше: ${assets[4].alt}`, exact: true })
      .click();
    const order = [assets[0], assets[1], assets[2], assets[4], assets[3]];
    expect(
      await picker
        .locator(".cms-selected-item img")
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute("src")),
        ),
    ).toEqual(order.map((asset) => asset.url));
    await section
      .getByLabel("Расположение фотографий", { exact: true })
      .selectOption({ label: "Крупная первая фотография" });
    await section.getByRole("button", { name: "Выше", exact: true }).click();
    await expect(
      page
        .locator(".cms-section-card")
        .nth(original.draft.sections.length - 1)
        .locator("summary")
        .first(),
    ).toContainText(marker);
    await save(page);
    expect(await (await page.request.get("/")).text()).not.toContain(marker);
    const saved = await homeEntity(page.request);
    const savedGallery = saved.draft.sections.find(
      (item) => item.heading === marker,
    )!;
    expect(savedGallery.data.mediaIds).toEqual(order.map((asset) => asset.id));
    expect(saved.draft.sections.indexOf(savedGallery)).toBe(
      original.draft.sections.length - 1,
    );
    await publish(page);
    const publicPage = await page.context().newPage();
    await publicPage.goto("/");
    const gallery = publicPage.locator("section").filter({
      has: publicPage.getByRole("heading", { name: marker, exact: true }),
    });
    await expect(gallery.locator(".public-gallery-grid")).toHaveAttribute(
      "data-layout",
      "mosaic",
    );
    expect(
      await gallery
        .locator(".public-gallery-grid img")
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute("src")),
        ),
    ).toEqual(order.map((asset) => asset.url));
    await publicPage.screenshot({
      path: testInfo.outputPath("cms-published-gallery.png"),
      fullPage: true,
    });
    await publicPage.close();
  } finally {
    await restoreHome(page.request, original);
    await removePhotos(page.request, assets);
  }
});

test("a new service needs no technical identifiers and publishes its chosen section, menu and images", async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  const home = await homeEntity(page.request);
  const destination = home.draft.sections.find(
    (section) => section.type === "service_list" && section.visible,
  );
  expect(destination).toBeDefined();
  const title = `Консультация для нового посетителя ${Date.now()}`;
  const assets = await uploadPhotos(
    page.request,
    2,
    `Фотография услуги ${Date.now()}`,
  );
  let createdId = "";
  try {
    await page.getByRole("link", { name: /Добавить услугу/ }).click();
    await expect(page.getByLabel("Тип материала", { exact: true })).toHaveValue(
      "service",
    );
    await page.getByLabel("Название", { exact: true }).fill(title);
    await page
      .getByLabel("Краткое описание", { exact: true })
      .fill("Индивидуальная встреча в удобное время.");
    await page
      .getByRole("textbox", { name: "Подробное описание", exact: true })
      .fill("На встрече обсудим ваш запрос и подходящий план работы.");
    const richDescription = page.getByRole("textbox", {
      name: "Подробное описание",
      exact: true,
    });
    await richDescription.press("ControlOrMeta+A");
    await page
      .getByRole("toolbar", {
        name: "Оформление: Подробное описание",
        exact: true,
      })
      .getByRole("button", { name: "Жирный", exact: true })
      .click();
    await page
      .getByLabel("Раздел сайта", { exact: true })
      .selectOption({ label: destination!.heading });
    const picker = page
      .locator(".cms-media-picker")
      .filter({ hasText: "Фотографии материала" });
    await picker
      .getByRole("button", { name: "Добавить фотографии", exact: true })
      .click();
    for (const asset of [assets[1], assets[0]]) {
      await picker
        .locator(".cms-picker-option")
        .filter({ hasText: asset.alt })
        .click();
    }
    await picker
      .getByRole("button", { name: "Закрыть библиотеку", exact: true })
      .click();
    await page
      .locator("summary")
      .filter({ hasText: /^Меню сайта$/ })
      .click();
    await expect(
      page.getByLabel("Показывать в меню", { exact: true }),
    ).toBeChecked();
    await save(page);
    const listResponse = await page.request.get("/api/admin/cards");
    expect(listResponse.ok()).toBe(true);
    const created = (await listResponse.json()).data.find(
      (entity: { draft: { title: string } }) => entity.draft.title === title,
    );
    expect(created).toBeDefined();
    createdId = created.id;
    expect(created.draft.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(created.draft.sectionId).toBe(destination!.id);
    await publish(page);
    const publicPage = await page.context().newPage();
    await publicPage.goto("/");
    const section = publicPage.locator(`section[id="${destination!.key}"]`);
    const card = section.locator(".public-card").filter({
      has: publicPage.getByRole("heading", { name: title, exact: true }),
    });
    await expect(card).toBeVisible();
    await expect(card.locator("img")).toHaveAttribute("src", assets[1].url);
    await expect(
      publicPage
        .locator(".public-desktop-nav")
        .locator(`a[href="/topics/${created.draft.slug}"]`),
    ).toHaveCount(1);
    await expect(
      publicPage
        .locator(".public-mobile-nav")
        .locator(`a[href="/topics/${created.draft.slug}"]`),
    ).toHaveCount(1);
    await card.getByRole("link", { name: title, exact: true }).click();
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(
      title,
    );
    await expect(publicPage.locator(".public-prose strong")).toContainText(
      "На встрече обсудим ваш запрос",
    );
    expect(
      await publicPage
        .locator(".public-detail .public-picture img")
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute("src")),
        ),
    ).toEqual([assets[1].url, assets[0].url]);
    await publicPage.close();
  } finally {
    const entities = (await (await page.request.get("/api/admin/cards")).json())
      .data;
    const current = entities.find(
      (entity: { id: string; draft: { title: string } }) =>
        createdId ? entity.id === createdId : entity.draft.title === title,
    );
    if (current) {
      const removed = await page.request.delete(
        `/api/admin/cards/${current.id}`,
        { headers, data: { version: current.version } },
      );
      expect(removed.ok()).toBe(true);
    }
    await removePhotos(page.request, assets);
  }
});

test("inline Russian validation, mobile saving and unsaved navigation protection help a beginner", async ({
  page,
}, testInfo) => {
  await login(page);
  const title = `Проверка понятного редактора ${Date.now()}`;
  let createdId = "";
  try {
    await page.goto("/admin/cards");
    await page
      .getByRole("button", { name: "Создать карточку", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Сохранить изменения", exact: true })
      .click();
    const titleField = page.getByLabel("Название", { exact: true });
    await expect(titleField).toHaveAttribute("aria-invalid", "true");
    const errorId = await titleField.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    await expect(page.locator(`[id="${errorId}"]`)).toContainText("Заполните");
    await titleField.fill(title);
    await page
      .getByRole("textbox", { name: "Подробное описание", exact: true })
      .fill("Новый текст можно изменить без технических знаний.");
    await save(page);
    await expect(titleField).not.toHaveAttribute("aria-invalid", "true");
    const saved = (
      await (await page.request.get("/api/admin/cards")).json()
    ).data.find(
      (entity: { draft: { title: string } }) => entity.draft.title === title,
    );
    expect(saved).toBeDefined();
    createdId = saved.id;
    await page.setViewportSize({ width: 375, height: 812 });
    await titleField.fill(`${title} — сохранено с телефона`);
    await save(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("cms-mobile-edit-saved.png"),
      fullPage: true,
    });
    await titleField.fill(`${title} — ещё не сохранено`);
    const mediaLink = page
      .getByRole("navigation", { name: "Управление сайтом" })
      .getByRole("link", { name: "Фотографии и файлы", exact: true });
    page.removeAllListeners("dialog");
    const cancelled = page.waitForEvent("dialog");
    const cancelClick = mediaLink.click();
    const cancelDialog = await cancelled;
    expect(cancelDialog.message()).toContain("Несохранённые изменения");
    await cancelDialog.dismiss();
    await cancelClick;
    await expect(page).toHaveURL(/\/admin\/cards$/);
    await expect(titleField).toHaveValue(`${title} — ещё не сохранено`);
    const accepted = page.waitForEvent("dialog");
    const acceptClick = mediaLink.click();
    await (await accepted).accept();
    await acceptClick;
    await expect(page).toHaveURL(/\/admin\/media$/);
    await expect(
      page.getByRole("heading", { name: "Фотографии и файлы", exact: true }),
    ).toBeVisible();
  } finally {
    const entities = (await (await page.request.get("/api/admin/cards")).json())
      .data;
    const current = entities.find(
      (entity: { id: string; draft: { title: string } }) =>
        createdId
          ? entity.id === createdId
          : entity.draft.title.startsWith(title),
    );
    if (current) {
      const removed = await page.request.delete(
        `/api/admin/cards/${current.id}`,
        { headers, data: { version: current.version } },
      );
      expect(removed.ok()).toBe(true);
    }
  }
});

test("custom page preview matches the public title, body and sections when its hero is hidden", async ({
  page,
}) => {
  await login(page);
  const title = `Страница с обычными разделами ${Date.now()}`;
  const pageBody =
    "Общее описание страницы остаётся доступным после добавления разделов.";
  const sectionHeading = "Подробности консультации";
  const sectionBody = "Текст отдельного раздела также виден посетителям.";
  let createdId = "";
  try {
    await page.goto("/admin/pages");
    await page
      .getByRole("button", { name: "Создать страницу", exact: true })
      .click();
    await page.getByLabel("Название", { exact: true }).fill(title);
    await page
      .getByRole("textbox", { name: "Подробное описание", exact: true })
      .fill(pageBody);
    await page
      .getByLabel("Шаблон нового раздела", { exact: true })
      .selectOption({ label: "Текстовый раздел" });
    await page
      .getByRole("button", { name: "Добавить раздел", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Подробное описание", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Подробное описание", exact: true }),
    ).toHaveText(pageBody);
    const textSection = page.locator(".cms-section-card").first();
    await textSection.locator("summary").first().click();
    await textSection
      .getByLabel("Заголовок раздела", { exact: true })
      .fill(sectionHeading);
    await textSection
      .getByRole("textbox", { name: "Текст раздела", exact: true })
      .fill(sectionBody);
    await page
      .getByLabel("Шаблон нового раздела", { exact: true })
      .selectOption({ label: "Первый экран" });
    await page
      .getByRole("button", { name: "Добавить раздел", exact: true })
      .click();
    const hiddenHero = page.locator(".cms-section-card").last();
    await hiddenHero.locator("summary").first().click();
    await hiddenHero
      .getByLabel("Заголовок раздела", { exact: true })
      .fill("Скрытый первый экран");
    await hiddenHero
      .getByLabel("Показывать на сайте", { exact: true })
      .uncheck();
    await expect(
      page.getByRole("textbox", { name: "Подробное описание", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Подробное описание", exact: true }),
    ).toHaveText(pageBody);
    await save(page);
    const response = await page.request.get("/api/admin/pages");
    expect(response.ok()).toBe(true);
    const entity: Entity<PageDraft> = (await response.json()).data.find(
      (item: Entity<PageDraft>) => item.draft.title === title,
    );
    expect(entity).toBeDefined();
    createdId = entity.id;
    expect(
      (await page.request.get(`/pages/${entity.draft.slug}`)).status(),
    ).toBe(404);
    const preview = await page.context().newPage();
    await preview.goto(`/admin/preview/pages/${entity.id}`);
    await expect(preview.locator("main")).toHaveCount(1);
    await expect(preview.locator(".cms-sidebar")).toHaveCount(0);
    const publicBounds = await preview.locator(".public-site").boundingBox();
    expect(publicBounds).not.toBeNull();
    expect(publicBounds!.width).toBeGreaterThanOrEqual(
      preview.viewportSize()!.width - 32,
    );
    await expect(preview.locator(".public-site main h1")).toHaveText(title);
    await expect(preview.locator(".public-detail .public-prose")).toHaveText(
      pageBody,
    );
    await expect(
      preview.getByRole("heading", { name: sectionHeading, exact: true }),
    ).toBeVisible();
    await expect(preview.locator(".public-section")).toContainText(sectionBody);
    await expect(preview.locator(".public-site")).not.toContainText(
      "Скрытый первый экран",
    );
    await preview.close();
    await publish(page);
    const published = await page.context().newPage();
    await published.goto(`/pages/${entity.draft.slug}`);
    await expect(published.locator(".public-site main h1")).toHaveText(title);
    await expect(published.locator(".public-detail .public-prose")).toHaveText(
      pageBody,
    );
    await expect(
      published.getByRole("heading", { name: sectionHeading, exact: true }),
    ).toBeVisible();
    await expect(published.locator(".public-section")).toContainText(
      sectionBody,
    );
    await expect(published.locator(".public-site")).not.toContainText(
      "Скрытый первый экран",
    );
    await published.close();
  } finally {
    const entities: Entity<PageDraft>[] = (
      await (await page.request.get("/api/admin/pages")).json()
    ).data;
    const current = entities.find((entity) =>
      createdId ? entity.id === createdId : entity.draft.title === title,
    );
    if (current) {
      const removed = await page.request.delete(
        `/api/admin/pages/${current.id}`,
        { headers, data: { version: current.version } },
      );
      expect(removed.ok()).toBe(true);
    }
  }
});
