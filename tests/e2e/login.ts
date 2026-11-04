import { expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

/** Reuse the isolated test session; do not weaken production login rate limits. */
export async function loginAsMaintainer(page: Page) {
  const stateFile = process.env.E2E_AUTH_STATE;
  if (stateFile && existsSync(stateFile)) {
    const { readFile } = await import("node:fs/promises");
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    await page.context().addCookies(state.cookies);
    await page.goto("/admin");
    if (/\/admin$/.test(page.url())) return;
  }
  await page.goto("/admin/login");
  await page
    .getByLabel("Электронная почта", { exact: true })
    .fill(process.env.TEST_ADMIN_EMAIL!);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  if (stateFile) await page.context().storageState({ path: stateFile });
}
