import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PdfBlockView } from "./PdfBlockView";

export const PdfBlock = TiptapNode.create({
  name: "pdfBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      name: { default: "PDF" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-pdf-src]",
        getAttrs: (dom: HTMLElement) => ({
          src: dom.getAttribute("data-pdf-src"),
          name: dom.getAttribute("data-pdf-name") || "PDF",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src || "";
    const name = HTMLAttributes.name || "PDF";
    return [
      "div",
      mergeAttributes({ "data-pdf-src": src, "data-pdf-name": name }),
      [
        "p",
        {},
        [
          "a",
          { href: src, target: "_blank", rel: "noopener noreferrer" },
          `\u{1F4C4} ${name} (PDF)`,
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfBlockView);
  },
});
