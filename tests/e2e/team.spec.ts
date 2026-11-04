import { test, expect } from "@playwright/test";
import { loginAsMaintainer } from "./login";

test("owner invites a maintainer in Russian CMS and immediately revokes access", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await loginAsMaintainer(page);
  await page.getByRole("link", { name: "Мейнтейнеры сайта" }).click();
  await expect(
    page.getByRole("heading", { name: "Мейнтейнеры сайта" }),
  ).toBeVisible();

  const email = "teammate-" + Date.now() + "@example.test";
  await page
    .getByLabel("Электронная почта нового мейнтейнера")
    .fill(email);
  await page
    .getByRole("button", { name: "Создать ссылку-приглашение" })
    .click();
  const inviteLink = await page
    .getByRole("textbox", { name: "Ссылка для входа" })
    .inputValue();
  expect(inviteLink).toMatch(/\/admin\/invite#[0-9a-f]{64}$/);
  await expect(page.getByText(email).first()).toBeVisible();

  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await member.goto(inviteLink);
    await member.getByLabel("Придумайте пароль").fill("member-password-very-long");
    await member.getByLabel("Повторите пароль").fill("member-password-very-long");
    await member.getByRole("button", { name: "Установить пароль" }).click();
    await expect(
      member.getByRole("heading", { name: "Пароль установлен" }),
    ).toBeVisible();
    await member.getByRole("link", { name: "Перейти ко входу" }).click();
    await member.getByLabel("Электронная почта").fill(email);
    await member.getByLabel("Пароль", { exact: true }).fill(
      "member-password-very-long",
    );
    await member.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(member).toHaveURL(/\/admin$/);
    await expect(
      member.getByRole("link", { name: "Мейнтейнеры сайта" }),
    ).toHaveCount(0);
    const forbidden = await member.request.get("/api/admin/team");
    expect(forbidden.status()).toBe(403);

    await page.getByRole("button", { name: "Обновить список" }).click();
    const accountRow = page
      .locator(".panel")
      .filter({ has: page.getByRole("heading", { name: "Учётные записи" }) })
      .locator("tr")
      .filter({ hasText: email });
    await expect(accountRow).toContainText("Мейнтейнер");
    page.once("dialog", (dialog) => dialog.accept());
    await accountRow.getByRole("button", { name: "Отключить" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Доступ отключён" }),
    ).toBeVisible();
    await member.goto("/admin");
    await expect(member).toHaveURL(/\/admin\/login$/);

    await accountRow.getByRole("button", { name: "Восстановить" }).click();
    await expect(accountRow).toContainText("Активен");

    page.once("dialog", (dialog) => dialog.accept());
    await accountRow.getByRole("button", { name: "Сбросить пароль" }).click();
    const recovery = await page
      .getByRole("textbox", { name: "Ссылка для входа" })
      .inputValue();
    await member.goto(recovery);
    await member.getByLabel("Придумайте пароль").fill("new-member-password-long");
    await member.getByLabel("Повторите пароль").fill("new-member-password-long");
    await member.getByRole("button", { name: "Установить пароль" }).click();
    await expect(
      member.getByRole("heading", { name: "Пароль установлен" }),
    ).toBeVisible();
  } finally {
    await memberContext.close();
  }
});
