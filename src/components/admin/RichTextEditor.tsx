"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  richTextLinkSchema,
  richTextPlainText,
  type RichTextDocument,
} from "@/shared/rich-text";
type Inline = RichTextDocument["blocks"][number]["children"][number];
function readDocument(root: HTMLElement): RichTextDocument {
  const blocks: RichTextDocument["blocks"] = [];
  function inline(node: Node, marks: Omit<Inline, "text"> = {}): Inline[] {
    if (node.nodeType === Node.TEXT_NODE)
      return [{ text: node.textContent || "", ...marks }];
    if (!(node instanceof HTMLElement)) return [];
    const next = { ...marks };
    if (node.matches("b,strong")) next.bold = true;
    if (node.matches("i,em")) next.italic = true;
    if (node.matches("a")) {
      const href = node.getAttribute("href") || "";
      if (richTextLinkSchema.safeParse(href).success) next.href = href;
    }
    if (node.tagName === "BR") return [{ text: "\n", ...next }];
    return Array.from(node.childNodes).flatMap((child) => inline(child, next));
  }
  function block(node: Node, list?: "bullet" | "number") {
    if (node instanceof HTMLElement && node.matches("ul,ol")) {
      Array.from(node.childNodes).forEach((child) =>
        block(child, node.tagName === "OL" ? "number" : "bullet"),
      );
      return;
    }
    const children = inline(node);
    if (children.some((child) => child.text))
      blocks.push({
        type:
          list ||
          (node instanceof HTMLElement && /^H[1-6]$/.test(node.tagName)
            ? "heading"
            : "paragraph"),
        children,
      });
  }
  Array.from(root.childNodes).forEach((node) => block(node));
  return { version: 1, blocks };
}
function writeDocument(root: HTMLElement, document: RichTextDocument) {
  root.replaceChildren();
  let list: HTMLElement | undefined;
  let listType = "";
  document.blocks.forEach((block) => {
    const tag =
      block.type === "heading"
        ? "h3"
        : block.type === "bullet" || block.type === "number"
          ? "li"
          : "p";
    const element = window.document.createElement(tag);
    block.children.forEach((child) => {
      let node: Node = window.document.createTextNode(child.text);
      if (child.bold) {
        const mark = window.document.createElement("strong");
        mark.append(node);
        node = mark;
      }
      if (child.italic) {
        const mark = window.document.createElement("em");
        mark.append(node);
        node = mark;
      }
      if (child.href && richTextLinkSchema.safeParse(child.href).success) {
        const link = window.document.createElement("a");
        link.href = child.href;
        link.append(node);
        node = link;
      }
      element.append(node);
    });
    if (tag === "li") {
      if (!list || listType !== block.type) {
        list = window.document.createElement(
          block.type === "number" ? "ol" : "ul",
        );
        root.append(list);
        listType = block.type;
      }
      list.append(element);
    } else {
      list = undefined;
      listType = "";
      root.append(element);
    }
  });
}
export function RichTextEditor({
  label,
  value,
  plainText,
  error: fieldError,
  onChange,
}: {
  label: string;
  value?: RichTextDocument;
  plainText: string;
  error?: string;
  onChange: (text: string, document: RichTextDocument) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef("");
  const [error, setError] = useState("");
  const documentValue = value || {
    version: 1 as const,
    blocks: plainText
      .split(/\n\n/)
      .filter(Boolean)
      .map((text) => ({ type: "paragraph" as const, children: [{ text }] })),
  };
  const serialized = JSON.stringify(documentValue);
  useEffect(() => {
    if (ref.current && last.current !== serialized) {
      writeDocument(ref.current, JSON.parse(serialized));
      last.current = serialized;
    }
  }, [serialized]);
  function changed() {
    if (!ref.current) return;
    const doc = readDocument(ref.current);
    last.current = JSON.stringify(doc);
    onChange(richTextPlainText(doc), doc);
  }
  function command(name: string, argument?: string) {
    ref.current?.focus();
    window.document.execCommand(name, false, argument);
    changed();
  }
  return (
    <div className="cms-rich-field">
      <label id={`${id}-label`}>{label}</label>
      <div
        className="cms-rich-toolbar"
        role="toolbar"
        aria-label={`Оформление: ${label}`}
      >
        {[
          ["Жирный", "bold"],
          ["Курсив", "italic"],
          ["Список", "insertUnorderedList"],
          ["Нумерация", "insertOrderedList"],
        ].map(([title, action]) => (
          <button
            type="button"
            key={action}
            className="secondary"
            title={title}
            aria-label={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(action)}
          >
            {title}
          </button>
        ))}
        <button
          type="button"
          className="secondary"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("formatBlock", "h3")}
        >
          Заголовок
        </button>
        <button
          type="button"
          className="secondary"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("formatBlock", "p")}
        >
          Абзац
        </button>
        <button
          type="button"
          className="secondary"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const href = window.prompt(
              "Куда ведёт ссылка? Укажите адрес страницы или ссылку, начинающуюся с https://",
            );
            if (href === null) return;
            if (!richTextLinkSchema.safeParse(href).success) {
              setError(
                "Укажите безопасную ссылку: https://example.ru или адрес страницы сайта.",
              );
              return;
            }
            setError("");
            command("createLink", href);
          }}
        >
          Ссылка
        </button>
        <button
          type="button"
          className="secondary"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command("unlink")}
        >
          Убрать ссылку
        </button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-invalid={Boolean(fieldError)}
        aria-describedby={fieldError ? `${id}-error` : undefined}
        aria-labelledby={`${id}-label`}
        contentEditable
        suppressContentEditableWarning
        className="cms-rich-input"
        onInput={changed}
        onPaste={(event) => {
          event.preventDefault();
          window.document.execCommand(
            "insertText",
            false,
            event.clipboardData.getData("text/plain"),
          );
          changed();
        }}
        onDrop={(event) => event.preventDefault()}
      />
      {fieldError && (
        <p id={`${id}-error`} className="error" role="alert">
          {fieldError}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
