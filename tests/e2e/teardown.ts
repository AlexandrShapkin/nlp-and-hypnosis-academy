import { execFileSync } from "node:child_process";
export default function teardown() {
  if (process.env.E2E_AUTO_BOOTSTRAP === "true")
    execFileSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "-e",
        "import {loadEnvConfig} from '@next/env';loadEnvConfig(process.cwd());import('./src/db/index.ts').then((module)=>{const sqlite=module.sqlite || module.default.sqlite;const u=sqlite.prepare('SELECT id FROM users WHERE email=?').get(process.env.TEST_ADMIN_EMAIL) as {id:string}|undefined;if(u){sqlite.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);sqlite.prepare('DELETE FROM users WHERE id=?').run(u.id)}sqlite.close()})",
      ],
      { env: process.env, stdio: "pipe" },
    );
}
