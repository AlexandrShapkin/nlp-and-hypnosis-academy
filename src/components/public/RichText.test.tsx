import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "./RichText";
import { type RichTextDocument } from "@/shared/rich-text";

describe("safe public rich text", () => {
  it("renders formatting, headings and adjacent list groups as semantic HTML", () => {
    const document: RichTextDocument = {
      version: 1,
      blocks: [
        { type: "heading", children: [{ text: "Заголовок" }] },
        {
          type: "paragraph",
          children: [
            { text: "Важно", bold: true },
            { text: " мягко", italic: true },
            { text: "Связаться", href: "/#contact" },
          ],
        },
        { type: "bullet", children: [{ text: "Первый" }] },
        { type: "bullet", children: [{ text: "Второй" }] },
        { type: "number", children: [{ text: "Шаг" }] },
        {
          type: "paragraph",
          children: [{ text: "<script>alert(1)</script>" }],
        },
      ],
    };
    const html = renderToStaticMarkup(
      <RichText document={document} headingLevel={2} />,
    );
    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>Важно</strong>");
    expect(html).toContain("<em> мягко</em>");
    expect(html).toContain('href="/#contact"');
    expect(html.match(/<ul>/g)).toHaveLength(1);
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain("<ol>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("falls back to escaped legacy text if a stored document is invalid", () => {
    const document = {
      version: 1,
      blocks: [
        {
          type: "paragraph",
          children: [{ text: "Unsafe", href: "javascript:alert(1)" }],
        },
      ],
    } as RichTextDocument;
    const html = renderToStaticMarkup(
      <RichText
        document={document}
        text={"Один\n\nДва <img onerror=alert(1)>"}
      />,
    );
    expect(html).toContain("<p>Один</p>");
    expect(html).toContain("Два &lt;img");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
  });

  it("preserves intentionally cleared rich content instead of resurrecting legacy body", () => {
    const html = renderToStaticMarkup(
      <RichText document={{ version: 1, blocks: [] }} text="Старый текст" />,
    );
    expect(html).not.toContain("Старый текст");
  });
});
