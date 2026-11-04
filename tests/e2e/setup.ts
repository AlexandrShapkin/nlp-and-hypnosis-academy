import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
export default function setup() {
  if (process.env.TEST_ADMIN_EMAIL && process.env.TEST_ADMIN_PASSWORD) return;
  process.env.E2E_AUTO_BOOTSTRAP = "true";
  process.env.TEST_ADMIN_EMAIL = `e2e-${randomBytes(6).toString("hex")}@example.test`;
  process.env.TEST_ADMIN_PASSWORD = randomBytes(32).toString("hex");
  try {
    execFileSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/db.ts", "bootstrap"],
      {
        env: {
          ...process.env,
          ADMIN_BOOTSTRAP_EMAIL: process.env.TEST_ADMIN_EMAIL,
          ADMIN_BOOTSTRAP_PASSWORD: process.env.TEST_ADMIN_PASSWORD,
        },
        stdio: "pipe",
      },
    );
  } catch {
    throw new Error(
      "Authenticated E2E needs an empty local database for one-time random bootstrap, or private TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables. No default credentials are used.",
    );
  }
}
