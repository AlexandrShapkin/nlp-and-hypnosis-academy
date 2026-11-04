import { loginAsMaintainer } from "./login";
import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("maintainer uploads a header logo visually and publishes it through site settings", async ({
  page,
}) => {
  await loginAsMaintainer(page);

  const headers = {
    Origin: "http://localhost:8080",
    "x-requested-with": "CMS",
  };
  const originalResponse = await page.request.get("/api/admin/settings");
  expect(originalResponse.ok()).toBe(true);
  const original = (await originalResponse.json()).data;
  const alt = `CMS logo test ${Date.now()}`;
  let uploadedId = "";

  try {
    await page.goto("/admin/settings");
    const picker = page
      .locator(".cms-media-picker")
      .filter({ hasText: "Логотип в шапке сайта" });
    await picker.getByRole("button", { name: "Выбрать изображение" }).click();
    const png = await sharp({
      create: { width: 120, height: 60, channels: 3, background: "#255e50" },
    })
      .png()
      .toBuffer();
    await picker.getByLabel("Файл изображения").setInputFiles({
      name: "logo-test.png",
      mimeType: "image/png",
      buffer: png,
    });
    await picker
      .getByLabel("Что изображено на фотографии (обязательно)")
      .fill(alt);
    await picker.getByRole("button", { name: "Загрузить и выбрать" }).click();
    await expect(picker).toContainText(alt);

    const mediaResponse = await page.request.get("/api/admin/media");
    expect(mediaResponse.ok()).toBe(true);
    const images = (await mediaResponse.json()).data as {
      id: string;
      alt: string;
      url: string;
    }[];
    const uploaded = images.find((asset) => asset.alt === alt);
    expect(uploaded).toBeDefined();
    uploadedId = uploaded!.id;

    await page
      .getByRole("button", { name: "Сохранить и применить настройки" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Настройки сохранены" }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.locator(".public-header .public-brand img"),
    ).toHaveAttribute("src", uploaded!.url);
  } finally {
    const response = await page.request.get("/api/admin/settings");
    if (response.ok()) {
      const current = await response.json();
      await page.request.patch("/api/admin/settings", {
        headers,
        data: { ...original, version: current.version },
      });
    }
    if (uploadedId) {
      await page.request.delete(`/api/admin/media/${uploadedId}`, { headers });
    }
  }
});
