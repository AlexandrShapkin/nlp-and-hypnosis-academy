import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/tmp/nlp-playwright";
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/setup.ts",
  globalTeardown: "./tests/e2e/teardown.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    launchOptions: {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: "/tmp/nlp-chrome-config",
        XDG_CACHE_HOME: "/tmp/nlp-chrome-cache",
      },
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/tmp/nlp-browser/chrome-linux64/chrome")
          ? "/tmp/nlp-browser/chrome-linux64/chrome"
          : undefined),
    },
  },
  reporter: "list",
  timeout: 45000,
});
