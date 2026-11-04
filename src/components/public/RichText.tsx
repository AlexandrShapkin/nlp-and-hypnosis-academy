import type { ReactNode } from "react";
import { richTextSchema, type RichTextDocument } from "@/shared/rich-text";

/** Render only validated document nodes; legacy text remains escaped by React. */
export function RichText({
  document,
  text = "",
  className = "public-prose",
  headingLevel = 3,
}: {
  document?: RichTextDocument;
  text?: string;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const parsed = richTextSchema.safeParse(document);
  if (!parsed.success)
    return (
      <div className={className}>
        {text
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </div>
    );

  const blocks = parsed.data.blocks;
  const content: ReactNode[] = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const inline = (children: typeof block.children) =>
      children.map((node, i) => {
        let value: ReactNode = node.text;
        if (node.bold) value = <strong>{value}</strong>;
        if (node.italic) value = <em>{value}</em>;
        return node.href ? (
          <a href={node.href} key={i}>
            {value}
          </a>
        ) : (
          <span key={i}>{value}</span>
        );
      });
    if (block.type === "bullet" || block.type === "number") {
      const start = index;
      const items: ReactNode[] = [];
      while (index < blocks.length && blocks[index].type === block.type) {
        items.push(<li key={index}>{inline(blocks[index].children)}</li>);
        index++;
      }
      index--;
      content.push(
        block.type === "bullet" ? (
          <ul key={start}>{items}</ul>
        ) : (
          <ol key={start}>{items}</ol>
        ),
      );
    } else if (block.type === "heading") {
      content.push(
        headingLevel === 2 ? (
          <h2 key={index}>{inline(block.children)}</h2>
        ) : (
          <h3 key={index}>{inline(block.children)}</h3>
        ),
      );
    } else content.push(<p key={index}>{inline(block.children)}</p>);
  }
  return <div className={className}>{content}</div>;
}
