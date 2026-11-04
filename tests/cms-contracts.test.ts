import { describe, expect, it } from "vitest";
import { cardSchema, pageSchema } from "../src/shared/content";
import { richTextSchema, richTextPlainText } from "../src/shared/rich-text";
import {
  adminErrorMessage,
  adminValidationFields,
} from "../src/server/admin-messages";

describe("safe beginner CMS contracts", () => {
  const document = {
    version: 1 as const,
    blocks: [
      {
        type: "paragraph" as const,
        children: [
          { text: "Здравствуйте", bold: true, href: "https://example.test" },
        ],
      },
    ],
  };
  it("preserves existing plain text and accepts additive safe documents", () => {
    expect(
      cardSchema.parse({ slug: "old", title: "Old", body: "Existing" }).body,
    ).toBe("Existing");
    expect(
      cardSchema.parse({ slug: "new", title: "New", bodyRichText: document })
        .bodyRichText,
    ).toEqual(document);
    expect(
      pageSchema.parse({
        slug: "new",
        title: "New",
        sections: [
          { id: "x", key: "x", type: "rich_text", bodyRichText: document },
        ],
      }).sections[0].bodyRichText,
    ).toEqual(document);
    expect(richTextPlainText(document)).toBe("Здравствуйте");
  });
  it("rejects executable URLs, arbitrary nodes, HTML properties and unbounded text", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,x",
      "//evil.test",
      "https://user:password@example.test",
      "/\\evil.test",
    ]) {
      expect(
        richTextSchema.safeParse({
          ...document,
          blocks: [{ type: "paragraph", children: [{ text: "x", href }] }],
        }).success,
      ).toBe(false);
    }
    expect(
      richTextSchema.safeParse({ ...document, html: "<script>" }).success,
    ).toBe(false);
    expect(
      richTextSchema.safeParse({
        ...document,
        blocks: [{ type: "iframe", children: [] }],
      }).success,
    ).toBe(false);
    expect(
      richTextSchema.safeParse({
        ...document,
        blocks: [
          { type: "paragraph", children: [{ text: "x".repeat(50001) }] },
        ],
      }).success,
    ).toBe(false);
  });
  it("returns Russian errors and precise nested validation paths", () => {
    expect(adminErrorMessage("Invalid email or password")).toContain(
      "Неверная",
    );
    expect(adminErrorMessage("SQLite error private details")).not.toContain(
      "SQLite",
    );
    const result = pageSchema.safeParse({
      slug: "bad slug",
      title: "",
      sections: [{ id: "x", key: "x", type: "hero", heading: "x".repeat(301) }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = adminValidationFields(result.error);
      expect(fields["sections.0.heading"][0]).toMatch(/[А-Яа-я]/);
      expect(fields.slug[0]).toContain("латинские");
    }
  });
});
