import { readFile } from "node:fs/promises";
import path from "node:path";
import { sqlite } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/.test(
      filename,
    )
  ) {
    return new Response(null, { status: 404 });
  }
  const asset = sqlite
    .prepare("SELECT id FROM media WHERE stored_key=?")
    .get(filename);
  if (!asset) return new Response(null, { status: 404 });
  try {
    const file = await readFile(
      path.join(process.cwd(), "public/uploads", filename),
    );
    return new Response(Uint8Array.from(file), {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
