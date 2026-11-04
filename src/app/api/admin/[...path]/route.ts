import { NextRequest, NextResponse } from "next/server";
import { requestClientKey } from "@/server/request";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sqlite } from "@/db";
import { getSession, login, logout, SESSION_COOKIE } from "@/server/auth";
import { ApiError, conflict } from "@/server/errors";
import * as store from "@/server/store";
import { safeUrlSchema, type MediaAsset } from "@/shared/content";
import { siteUrl, cardUrl, pageUrl } from "@/shared/urls";
export const runtime = "nodejs";
const ok = (data: unknown, version?: number, status = 200) =>
  NextResponse.json(
    { data, ...(version === undefined ? {} : { version }) },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    },
  );
const versionOf = (b: Record<string, unknown>) =>
  z.number().int().min(1).parse(b.version);
const navSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  href: safeUrlSchema,
  group: z.enum(["primary", "footer"]),
  order: z.number().int().min(0).max(10000),
  visible: z.boolean(),
  automatic: z.boolean().optional(),
  target: z
    .object({
      kind: z.enum(["card", "page", "section", "external"]),
      id: z.string().optional(),
      url: safeUrlSchema.optional(),
    })
    .optional(),
});
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const declaredSize = Number(req.headers.get("content-length") || 0);
    if (declaredSize > 6 * 1024 * 1024)
      throw new ApiError(413, "BODY_TOO_LARGE", "Request is too large");
    const parts = (await params).path;
    const [resource, id, action] = parts;
    const mutation = req.method !== "GET";
    if (mutation) {
      if (req.headers.get("origin") !== new URL(siteUrl()).origin)
        throw new ApiError(403, "CSRF", "Untrusted request origin");
      if (resource !== "auth" && req.headers.get("x-requested-with") !== "CMS")
        throw new ApiError(403, "CSRF", "Missing request protection");
    }
    if (resource === "auth" && id === "login" && req.method === "POST") {
      const input = z
        .object({
          email: z.email().max(254),
          password: z.string().min(1).max(256),
        })
        .parse(await req.json());
      const result = login(input.email, input.password, requestClientKey(req));
      const response = ok(result.user);
      response.cookies.set(SESSION_COOKIE, result.token, {
        httpOnly: true,
        sameSite: "strict",
        secure: new URL(siteUrl()).protocol === "https:",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
      return response;
    }
    const user = await getSession();
    if (!user)
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    if (resource === "auth" && id === "logout" && req.method === "POST") {
      logout(req.cookies.get(SESSION_COOKIE)?.value || "", user.id);
      const response = ok({ loggedOut: true });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    if (resource === "auth" && id === "session" && req.method === "GET")
      return ok(user);
    if (resource === "cards" || resource === "pages") {
      const kind = resource === "cards" ? "card" : "page";
      if (req.method === "GET") {
        const data = id ? store.getEntity(kind, id) : store.listEntities(kind);
        return ok(data, id && !Array.isArray(data) ? data.version : undefined);
      }
      const body = (await req.json()) as Record<string, unknown>;
      if (req.method === "POST" && !id) {
        const e = store.saveEntity(kind, body, undefined, undefined, user.id);
        return ok(e, e.version, 201);
      }
      if (req.method === "PATCH" && id) {
        const e = store.saveEntity(kind, body, id, versionOf(body), user.id);
        return ok(e, e.version);
      }
      if (req.method === "POST" && id && action === "publish") {
        const e = store.publishEntity(kind, id, versionOf(body), user.id);
        return ok(e, e.version);
      }
      if (
        (req.method === "POST" && action === "unpublish") ||
        req.method === "DELETE"
      ) {
        const e = store.unpublishEntity(
          kind,
          id,
          versionOf(body),
          user.id,
          req.method === "DELETE",
        );
        return ok(e, "version" in e ? e.version : undefined);
      }
    }
    if (resource === "theme") {
      if (req.method === "GET")
        return ok(store.getTheme(), store.getTheme().version);
      const b = (await req.json()) as Record<string, unknown>;
      let t;
      if (req.method === "PATCH" && !id)
        t = store.saveTheme(b, versionOf(b), user.id);
      else if (req.method === "POST" && id === "publish")
        t = store.publishTheme(versionOf(b), user.id);
      else if (req.method === "POST" && action === "restore")
        t = store.publishTheme(versionOf(b), user.id, id);
      else throw new ApiError(405, "METHOD", "Unsupported method");
      return ok(t, t.version);
    }
    if (resource === "settings") {
      if (req.method === "GET") {
        const s = store.getSettings();
        return ok(s.data, s.version);
      }
      if (req.method === "PATCH") {
        const b = (await req.json()) as Record<string, unknown>;
        const s = store.saveSettings(b, versionOf(b), user.id);
        return ok(s.data, s.version);
      }
    }
    if (resource === "navigation") {
      if (req.method === "GET") {
        const stored = store.manualNavigation();
        const auto = store.publicNavigation().filter((n) => n.automatic);
        return ok([
          ...stored.filter(
            (n) => !n.automatic || !auto.some((a) => a.id === n.id),
          ),
          ...auto,
        ]);
      }
      if (req.method === "PATCH") {
        const { items } = z
          .object({ items: z.array(navSchema).max(300) })
          .parse(await req.json());
        for (const n of items) {
          if (n.automatic) continue;
          if (
            n.href.startsWith("/topics/") &&
            !store
              .publishedEntities("card")
              .some((c) => cardUrl(c.slug) === n.href)
          )
            throw new ApiError(
              422,
              "NAV_TARGET",
              "Navigation requires published content",
            );
          if (
            n.href.startsWith("/pages/") &&
            !store
              .publishedEntities("page")
              .some((c) => pageUrl(c.slug) === n.href)
          )
            throw new ApiError(
              422,
              "NAV_TARGET",
              "Navigation requires published content",
            );
        }
        sqlite.transaction(() => {
          sqlite.prepare("DELETE FROM navigation").run();
          for (const n of items)
            sqlite
              .prepare("INSERT INTO navigation(id,payload) VALUES(?,?)")
              .run(n.id, JSON.stringify(n));
          store.audit("navigation.save", undefined, user.id);
        })();
        return ok(store.publicNavigation());
      }
    }
    if (resource === "redirects") {
      if (req.method === "GET")
        return ok(
          sqlite
            .prepare(
              "SELECT id,old_path AS oldPath,new_path AS newPath,status_code AS statusCode FROM redirects",
            )
            .all(),
        );
      if (req.method === "POST") {
        const b = z
          .object({ oldPath: z.string(), newPath: z.string() })
          .parse(await req.json());
        if (
          [
            ...store.publishedEntities("card").map((c) => cardUrl(c.slug)),
            ...store.publishedEntities("page").map((p) => pageUrl(p.slug)),
          ].includes(b.oldPath)
        )
          throw conflict("Source path has published content");
        store.addRedirect(b.oldPath, b.newPath, user.id);
        return ok(b, undefined, 201);
      }
    }
    if (resource === "media") {
      if (req.method === "GET") return ok(store.getMediaList());
      if (req.method === "POST") {
        const form = await req.formData();
        const file = form.get("file");
        const alt = z.string().trim().min(1).max(500).parse(form.get("alt"));
        if (
          !(file instanceof File) ||
          file.size > 5 * 1024 * 1024 ||
          file.size === 0
        )
          throw new ApiError(
            422,
            "UPLOAD",
            "Image must be between 1 byte and 5 MB",
          );
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new ApiError(422, "UPLOAD", "PNG, JPEG and WebP only");
        const bytes = Buffer.from(await file.arrayBuffer());
        const magic =
          (bytes[0] === 0x89 && bytes.subarray(1, 4).toString() === "PNG") ||
          (bytes[0] === 0xff && bytes[1] === 0xd8) ||
          (bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP");
        if (!magic)
          throw new ApiError(422, "UPLOAD", "Invalid image signature");
        let result;
        try {
          result = await sharp(bytes, { limitInputPixels: 24_000_000 })
            .rotate()
            .webp({ quality: 85 })
            .toBuffer({ resolveWithObject: true });
        } catch {
          throw new ApiError(422, "UPLOAD", "Invalid or oversized image");
        }
        const key = `${randomUUID()}.webp`;
        await mkdir(path.join(process.cwd(), "public/uploads"), {
          recursive: true,
        });
        await writeFile(
          path.join(process.cwd(), "public/uploads", key),
          result.data,
        );
        const media: MediaAsset = {
          id: randomUUID(),
          url: `/uploads/${key}`,
          alt,
          caption: z
            .string()
            .max(1000)
            .parse(form.get("caption") || ""),
          credit: z
            .string()
            .max(500)
            .parse(form.get("credit") || ""),
          width: result.info.width,
          height: result.info.height,
        };
        sqlite
          .prepare("INSERT INTO media(id,payload,stored_key) VALUES(?,?,?)")
          .run(media.id, JSON.stringify(media), key);
        store.audit("media.upload", media.id, user.id);
        return ok(media, undefined, 201);
      }
      if (req.method === "PATCH" && id) {
        const existing = store.getMediaList().find((m) => m.id === id);
        if (!existing) throw new ApiError(404, "NOT_FOUND", "Media not found");
        const b = z
          .object({
            alt: z.string().trim().min(1).max(500),
            caption: z.string().max(1000),
            credit: z.string().max(500),
          })
          .parse(await req.json());
        const media = { ...existing, ...b };
        sqlite
          .prepare("UPDATE media SET payload=? WHERE id=?")
          .run(JSON.stringify(media), id);
        store.audit("media.save", id, user.id);
        return ok(media);
      }
      if (req.method === "DELETE" && id) {
        const all = [
          ...store.listEntities("card"),
          ...store.listEntities("page"),
        ];
        if (
          all.some((e) => JSON.stringify([e.draft, e.published]).includes(id)) ||
          JSON.stringify(store.getSettings().data).includes(id)
        )
          throw conflict("Media is in use by site content or settings. Remove the reference before deleting.");
        const r = sqlite
          .prepare("SELECT stored_key FROM media WHERE id=?")
          .get(id) as { stored_key: string } | undefined;
        if (!r) throw new ApiError(404, "NOT_FOUND", "Media not found");
        sqlite.prepare("DELETE FROM media WHERE id=?").run(id);
        await unlink(
          path.join(
            process.cwd(),
            "public/uploads",
            path.basename(r.stored_key),
          ),
        ).catch(() => {});
        store.audit("media.delete", id, user.id);
        return ok({ id });
      }
    }
    if (resource === "leads") {
      if (req.method === "GET")
        return ok(
          sqlite
            .prepare(
              "SELECT id,name,phone,email,message,privacy_version AS privacyVersion,marketing_opt_in AS marketingConsent,created_at AS createdAt,retention_until AS retentionUntil FROM leads ORDER BY created_at DESC",
            )
            .all(),
        );
      if (req.method === "DELETE" && id) {
        sqlite.prepare("DELETE FROM leads WHERE id=?").run(id);
        store.audit("lead.delete", id, user.id);
        return ok({ id });
      }
    }
    if (resource === "audit" && req.method === "GET")
      return ok(
        sqlite
          .prepare(
            "SELECT id,actor_id AS actorId,action,entity_id AS entityId,created_at AS createdAt FROM audit ORDER BY rowid DESC LIMIT 300",
          )
          .all(),
      );
    throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status },
      );
    if (e instanceof z.ZodError)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION",
            message: "Please check the submitted fields",
            fields: e.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    if (e instanceof Error && /UNIQUE constraint/.test(e.message))
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "This identifier is already in use",
          },
        },
        { status: 409 },
      );
    console.error(
      "Admin request failed",
      e instanceof Error ? e.name : "Unknown error",
    );
    return NextResponse.json(
      {
        error: { code: "INTERNAL", message: "Request could not be completed" },
      },
      { status: 500 },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
