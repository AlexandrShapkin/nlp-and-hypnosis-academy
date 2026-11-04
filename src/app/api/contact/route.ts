import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { sqlite } from "@/db";
import { limit } from "@/server/auth";
import { getSettings, audit } from "@/server/store";
import { ApiError } from "@/server/errors";
import { siteUrl } from "@/shared/urls";
import { requestClientKey } from "@/server/request";
export const runtime = "nodejs";
const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^[+\d\s()-]+$/),
  email: z
    .union([z.literal(""), z.email().max(254)])
    .optional()
    .default(""),
  message: z.string().max(5000).optional().default(""),
  privacyConsent: z.literal(true),
  privacyVersion: z.string().min(1).max(50),
  marketingConsent: z.boolean().optional().default(false),
  website: z.string().max(0).optional().default(""),
});
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== new URL(siteUrl()).origin)
      throw new ApiError(403, "ORIGIN", "Untrusted request origin");
    limit(
      `contact:${createHash("sha256")
        .update(requestClientKey(req))
        .digest("hex")}`,
      20,
      60 * 60 * 1000,
    );
    const data = contactSchema.parse(await req.json());
    if (data.privacyVersion !== getSettings().data.privacyVersion)
      throw new ApiError(
        422,
        "POLICY_VERSION",
        "Please review the current privacy policy",
      );
    const id = randomUUID();
    sqlite
      .prepare(
        "INSERT INTO leads(id,name,phone,email,message,privacy_version,marketing_opt_in,retention_until) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        data.name,
        data.phone,
        data.email,
        data.message,
        data.privacyVersion,
        data.marketingConsent ? 1 : 0,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      );
    audit("lead.create", id);
    return NextResponse.json({ data: { received: true } }, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError)
      return NextResponse.json(
        {
          error: {
            code: e.code,
            message:
              (
                {
                  ORIGIN:
                    "Не удалось проверить источник запроса. Обновите страницу и попробуйте снова.",
                  RATE_LIMITED:
                    "Слишком много попыток отправки. Пожалуйста, попробуйте позже.",
                  POLICY_VERSION:
                    "Ознакомьтесь с актуальной политикой конфиденциальности и подтвердите согласие.",
                } as Record<string, string>
              )[e.code] || "Не удалось отправить сообщение. Попробуйте позже.",
          },
        },
        { status: e.status },
      );
    if (e instanceof z.ZodError)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION",
            message: "Проверьте поля и согласие на обработку данных",
            fields: e.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    return NextResponse.json(
      {
        error: { code: "INTERNAL", message: "Не удалось отправить сообщение" },
      },
      { status: 500 },
    );
  }
}
