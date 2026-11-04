import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";
const file = (process.env.DATABASE_URL || "file:./data/site.sqlite").replace(
  /^file:/,
  "",
);
if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
export const sqlite = new Database(file);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
export const db = drizzle(sqlite, { schema });
export function migrate() {
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS migration_journal (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  const directory = path.join(process.cwd(), "src/db/migrations");
  const files = readdirSync(directory)
    .filter((name) => /^\d{4}\.sql$/.test(name))
    .sort();
  for (const name of files) {
    sqlite.transaction(() => {
      if (
        sqlite
          .prepare("SELECT name FROM migration_journal WHERE name=?")
          .get(name)
      )
        return;
      sqlite.exec(readFileSync(path.join(directory, name), "utf8"));
      sqlite.prepare("INSERT INTO migration_journal(name) VALUES(?)").run(name);
    })();
  }
}
migrate();
