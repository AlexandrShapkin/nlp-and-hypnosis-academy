import { beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
process.env.DATABASE_URL = `file:${path.join(mkdtempSync(path.join(tmpdir(), "academy-http-")), "test.sqlite")}`;
process.env.SITE_URL = "http://localhost:8080";
let cookieToken: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieToken ? { value: cookieToken } : undefined),
  }),
}));
let api: typeof import("../src/app/api/admin/[...path]/route");
let contact: typeof import("../src/app/api/contact/route");
const headers = {
  origin: "http://localhost:8080",
  "content-type": "application/json",
  "x-requested-with": "CMS",
};
function request(
  route: string,
  method: string,
  body?: unknown,
  customHeaders: Record<string, string> = headers,
) {
  return new NextRequest(`http://localhost:8080${route}`, {
    method,
    headers: customHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function admin(
  route: string,
  method: string,
  body?: unknown,
  customHeaders?: Record<string, string>,
) {
  const parts = route.split("/").filter(Boolean);
  return api.GET(request(`/api/admin/${route}`, method, body, customHeaders), {
    params: Promise.resolve({ path: parts }),
  });
}
beforeAll(async () => {
  api = await import("../src/app/api/admin/[...path]/route");
  contact = await import("../src/app/api/contact/route");
  const { seed } = await import("../src/server/seed");
  seed();
  const auth = await import("../src/server/auth");
  auth.bootstrap("http-owner@example.test", "http-test-secret-long");
});
describe("HTTP authorization, validation and consent", () => {
  it("ignores spoofed forwarding headers unless a trusted proxy is explicit", async () => {
    const { requestClientKey } = await import("../src/server/request");
    const { limit } = await import("../src/server/auth");
    const previous = process.env.TRUST_PROXY;
    try {
      delete process.env.TRUST_PROXY;
      const one = request(
        "/api/contact",
        "POST",
        {},
        { "x-forwarded-for": "192.0.2.1" },
      );
      const two = request(
        "/api/contact",
        "POST",
        {},
        { "x-forwarded-for": "192.0.2.2" },
      );
      expect(requestClientKey(one)).toBe("local");
      expect(requestClientKey(two)).toBe("local");
      limit(`spoof:${requestClientKey(one)}`, 1, 10000);
      expect(() => limit(`spoof:${requestClientKey(two)}`, 1, 10000)).toThrow(
        "try again",
      );
      process.env.TRUST_PROXY = "true";
      expect(requestClientKey(one)).toBe("192.0.2.1");
      expect(
        requestClientKey(
          request(
            "/api/contact",
            "POST",
            {},
            { "x-forwarded-for": "arbitrary" },
          ),
        ),
      ).toBe("local");
    } finally {
      if (previous === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = previous;
    }
  });
  it("requires server-side authentication and trusted origin", async () => {
    expect((await admin("cards", "GET")).status).toBe(401);
    expect(
      (await admin("cards", "POST", { title: "No", slug: "no" })).status,
    ).toBe(401);
    expect((await admin("cards", "POST", {}, {})).status).toBe(403);
    expect(
      (
        await admin("auth/login", "POST", {
          email: "http-owner@example.test",
          password: "wrong",
        })
      ).status,
    ).toBe(401);
    const response = await admin("auth/login", "POST", {
      email: "http-owner@example.test",
      password: "http-test-secret-long",
    });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    cookieToken = cookie.match(/academy_session=([^;]+)/)?.[1];
    expect(cookieToken).toBeTruthy();
    expect((await admin("cards", "GET")).status).toBe(200);
    expect(
      (
        await admin(
          "cards",
          "POST",
          { title: "CSRF", slug: "csrf" },
          {
            origin: "http://localhost:8080",
            "content-type": "application/json",
          },
        )
      ).status,
    ).toBe(403);
  });
  it("returns validation failures and revision conflicts", async () => {
    expect(
      (await admin("cards", "POST", { title: "Bad", slug: "../../escape" }))
        .status,
    ).toBe(422);
    const created = await admin("cards", "POST", {
      title: "HTTP card",
      slug: "http-card",
    });
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.data.draft.showInNavigation).toBe(true);
    expect(
      (await admin(`cards/${body.data.id}/publish`, "POST", { version: 999 }))
        .status,
    ).toBe(409);
    expect(
      (
        await admin(`cards/${body.data.id}/publish`, "POST", {
          version: body.version,
        })
      ).status,
    ).toBe(200);
  });
  it("blocks active uploads and validates alt text", async () => {
    const form = new FormData();
    form.set(
      "file",
      new File(['<svg onload="alert(1)"></svg>'], "../../evil.svg", {
        type: "image/svg+xml",
      }),
    );
    form.set("alt", "Bad upload");
    const req = new NextRequest("http://localhost:8080/api/admin/media", {
      method: "POST",
      headers: { origin: "http://localhost:8080", "x-requested-with": "CMS" },
      body: form,
    });
    expect(
      (await api.POST(req, { params: Promise.resolve({ path: ["media"] }) }))
        .status,
    ).toBe(422);
  });
  it("accepts a valid raster with alt text and preserves metadata", async () => {
    const sharp = (await import("sharp")).default;
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set(
      "file",
      new File([Uint8Array.from(png)], "image.png", { type: "image/png" }),
    );
    form.set("alt", "Test image alternative");
    form.set("caption", "Test caption");
    form.set("credit", "Test author");
    const req = new NextRequest("http://localhost:8080/api/admin/media", {
      method: "POST",
      headers: { origin: "http://localhost:8080", "x-requested-with": "CMS" },
      body: form,
    });
    const response = await api.POST(req, {
      params: Promise.resolve({ path: ["media"] }),
    });
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.alt).toBe("Test image alternative");
    expect(data.caption).toBe("Test caption");
    expect(data.credit).toBe("Test author");
    expect(data.url).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
    const uploads = await import("../src/app/uploads/[filename]/route");
    const filename = data.url.split("/").pop();
    const served = await uploads.GET(
      new Request(`http://localhost:8080${data.url}`),
      { params: Promise.resolve({ filename }) },
    );
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/webp");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await served.arrayBuffer()).byteLength).toBeGreaterThan(0);
    expect(
      (
        await uploads.GET(
          new Request("http://localhost:8080/uploads/missing"),
          { params: Promise.resolve({ filename: "../../secrets.webp" }) },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await uploads.GET(
          new Request("http://localhost:8080/uploads/missing"),
          {
            params: Promise.resolve({
              filename: "00000000-0000-0000-0000-000000000000.webp",
            }),
          },
        )
      ).status,
    ).toBe(404);

    const listed = await (await admin("media", "GET")).json();
    expect(listed.data.some((m: { id: string }) => m.id === data.id)).toBe(
      true,
    );
    expect((await admin(`media/${data.id}`, "DELETE")).status).toBe(200);
  });
  it("returns Russian public origin errors", async () => {
    const response = await contact.POST(
      request(
        "/api/contact",
        "POST",
        {},
        {
          origin: "https://untrusted.example",
          "content-type": "application/json",
        },
      ),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("ORIGIN");
    expect(body.error.message).toMatch(/[А-Яа-я]/);
  });
  it("requires explicit privacy consent and records optional consent separately", async () => {
    const fields = {
      name: "Test person",
      phone: "+7 999 111 22 33",
      email: "",
      message: "Test inquiry",
      privacyVersion: "1",
      marketingConsent: false,
    };
    expect(
      (
        await contact.POST(
          request("/api/contact", "POST", { ...fields, privacyConsent: false }),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await contact.POST(
          request("/api/contact", "POST", { ...fields, privacyConsent: true }),
        )
      ).status,
    ).toBe(201);
    const leads = await (await admin("leads", "GET")).json();
    expect(leads.data).toHaveLength(1);
    expect(leads.data[0].marketingConsent).toBe(0);
    expect(leads.data[0].privacyVersion).toBe("1");
    expect(
      (
        await contact.POST(
          request("/api/contact", "POST", {
            ...fields,
            privacyConsent: true,
            website: "spam",
          }),
        )
      ).status,
    ).toBe(422);
  });
  it("logout revokes the persisted token", async () => {
    const auth = await import("../src/server/auth");
    expect(auth.sessionFromToken(cookieToken)).toBeTruthy();
    const response = await api.POST(
      new NextRequest("http://localhost:8080/api/admin/auth/logout", {
        method: "POST",
        headers: { ...headers, cookie: `academy_session=${cookieToken}` },
      }),
      { params: Promise.resolve({ path: ["auth", "logout"] }) },
    );
    expect(response.status).toBe(200);
    expect(auth.sessionFromToken(cookieToken)).toBeNull();
    cookieToken = undefined;
    expect((await admin("audit", "GET")).status).toBe(401);
  });
});
