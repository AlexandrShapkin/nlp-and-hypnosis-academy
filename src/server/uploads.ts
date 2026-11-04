import path from "node:path";

// Runtime override isolates browser/integration uploads without changing public URLs.
export function uploadsDirectory(): string {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), "public/uploads");
}
