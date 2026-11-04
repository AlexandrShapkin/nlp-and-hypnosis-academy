import { z } from "zod";

// A bounded document, never HTML. Existing plain-text bodies remain supported.
export const richTextLinkSchema = z
  .string()
  .max(2000)
  .refine((value) => {
    if (/[\u0000-\u0020\\]/.test(value)) return false;
    if (/^\/(?!\/)/.test(value) || /^#[a-zA-Z0-9_-]+$/.test(value)) return true;
    if (
      /^mailto:[^@\s]+@[^@\s]+$/.test(value) ||
      /^tel:\+?[0-9()-]+$/.test(value)
    )
      return true;
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Укажите адрес страницы или безопасную ссылку");
export const richTextSchema = z
  .object({
    version: z.literal(1),
    blocks: z
      .array(
        z
          .object({
            type: z.enum(["paragraph", "heading", "bullet", "number"]),
            children: z
              .array(
                z
                  .object({
                    text: z.string().max(50000),
                    bold: z.boolean().optional(),
                    italic: z.boolean().optional(),
                    href: richTextLinkSchema.optional(),
                  })
                  .strict(),
              )
              .max(500),
          })
          .strict(),
      )
      .max(500),
  })
  .strict()
  .refine(
    (doc) =>
      doc.blocks.reduce(
        (n, block) =>
          n + block.children.reduce((m, child) => m + child.text.length, 0),
        0,
      ) <= 50000,
    "Текст слишком длинный: сократите его до 50 000 символов",
  );
export type RichTextDocument = z.infer<typeof richTextSchema>;
export function richTextPlainText(doc: RichTextDocument): string {
  return doc.blocks
    .map((block) => block.children.map((child) => child.text).join(""))
    .join("\n\n");
}
