import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import net from "node:net";

const probe = net.createServer();
await new Promise((resolve, reject) => {
  probe.once("error", () =>
    reject(
      new Error(
        "Port 8080 is busy. Stop the local app before isolated browser tests.",
      ),
    ),
  );
  probe.listen(8080, "127.0.0.1", resolve);
});
await new Promise((resolve) => probe.close(resolve));
const directory = await mkdtemp(path.join(tmpdir(), "academy-cms-e2e-"));
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: `file:${path.join(directory, "site.sqlite")}`,
  UPLOADS_DIR: path.join(directory, "uploads"),
  SITE_URL: "http://localhost:8080",
  E2E_AUTH_STATE: path.join(directory, "browser-state.json"),
  SEO_ALLOW_INDEXING: "false",
  TEST_ADMIN_EMAIL: `cms-${randomBytes(8).toString("hex")}@example.test`,
  TEST_ADMIN_PASSWORD: randomBytes(32).toString("hex"),
};
env.ADMIN_BOOTSTRAP_EMAIL = env.TEST_ADMIN_EMAIL;
env.ADMIN_BOOTSTRAP_PASSWORD = env.TEST_ADMIN_PASSWORD;
function run(args) {
  return new Promise((resolve, reject) => {
    const process = spawn("npm", args, { env, stdio: "inherit" });
    process.once("error", reject);
    process.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`npm ${args.join(" ")} failed (${code})`)),
    );
  });
}
let server;
try {
  await run(["run", "db:migrate"]);
  await run(["run", "db:seed"]);
  await run(["run", "admin:bootstrap"]);
  if (!process.argv.includes("--skip-build")) await run(["run", "build"]);
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "8080",
    ],
    { env, stdio: "inherit" },
  );
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null)
      throw new Error("Isolated server exited before readiness");
    try {
      const response = await fetch("http://localhost:8080");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for local server only. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("Isolated server readiness timeout");
  if (process.argv.includes("--serve-review")) {
    const fixture = path.join(directory, "review.json");
    await writeFile(
      fixture,
      JSON.stringify({
        email: env.TEST_ADMIN_EMAIL,
        password: env.TEST_ADMIN_PASSWORD,
        databaseUrl: env.DATABASE_URL,
        uploadsDir: env.UPLOADS_DIR,
      }),
      { mode: 0o600 },
    );
    console.log(
      `Independent review ready at http://localhost:8080. Temporary test fixture: ${fixture}`,
    );
    await new Promise((resolve) => {
      process.once("SIGTERM", resolve);
      process.once("SIGINT", resolve);
    });
  } else await run(["run", "test:e2e"]);
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await rm(directory, { recursive: true, force: true });
}
