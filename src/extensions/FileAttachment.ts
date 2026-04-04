import { Node, mergeAttributes } from "@tiptap/core";

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (attrs: {
        src: string;
        name: string;
        size?: number;
      }) => ReturnType;
    };
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    pdf: "\u{1F4C4}",
    doc: "\u{1F4DD}",
    docx: "\u{1F4DD}",
    xls: "\u{1F4CA}",
    xlsx: "\u{1F4CA}",
    ppt: "\u{1F4CA}",
    pptx: "\u{1F4CA}",
    zip: "\u{1F4E6}",
    rar: "\u{1F4E6}",
    "7z": "\u{1F4E6}",
    txt: "\u{1F4C3}",
    csv: "\u{1F4C3}",
    hwp: "\u{1F4C4}",
    hwpx: "\u{1F4C4}",
  };
  return icons[ext] || "\u{1F4CE}";
}

export const FileAttachment = Node.create<FileAttachmentOptions>({
  name: "fileAttachment",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: null },
      name: { default: "파일" },
      size: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-file-src]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            src: el.getAttribute("data-file-src"),
            name: el.getAttribute("data-file-name") || "파일",
            size: el.getAttribute("data-file-size")
              ? Number(el.getAttribute("data-file-size"))
              : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, {
        "data-file-src": HTMLAttributes.src,
        "data-file-name": HTMLAttributes.name,
        "data-file-size": HTMLAttributes.size ?? "",
      }),
    ];
  },

  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement("div");
      dom.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:10px 14px;margin:8px 0;border:1px solid var(--border, #e2e8f0);border-radius:10px;background:var(--muted, #f7fafc);cursor:default;max-width:400px;";

      const icon = document.createElement("span");
      icon.style.cssText = "font-size:24px;flex-shrink:0;line-height:1;";
      icon.textContent = getFileIcon(node.attrs.name);

      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;";

      const nameEl = document.createElement("a");
      nameEl.href = node.attrs.src;
      nameEl.target = "_blank";
      nameEl.rel = "noopener noreferrer";
      nameEl.textContent = node.attrs.name;
      nameEl.style.cssText =
        "display:block;font-size:13px;font-weight:600;color:var(--primary, #4A7DAC);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";

      const sizeEl = document.createElement("span");
      sizeEl.style.cssText =
        "font-size:11px;color:var(--muted-foreground, #718096);";
      if (node.attrs.size) {
        sizeEl.textContent = formatFileSize(node.attrs.size);
      }

      info.appendChild(nameEl);
      info.appendChild(sizeEl);
      dom.appendChild(icon);
      dom.appendChild(info);

      if (editor.isEditable) {
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "\u00D7";
        del.style.cssText =
          "flex-shrink:0;width:22px;height:22px;border:none;background:transparent;color:var(--muted-foreground, #718096);font-size:16px;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;";
        del.addEventListener("mouseenter", () => {
          del.style.background = "var(--destructive, #FF6B6B)";
          del.style.color = "#fff";
        });
        del.addEventListener("mouseleave", () => {
          del.style.background = "transparent";
          del.style.color = "var(--muted-foreground, #718096)";
        });
        del.addEventListener("click", () => {
          const pos = editor.view.posAtDOM(dom, 0);
          editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
        });
        dom.appendChild(del);
      }

      return { dom };
    };
  },

  addCommands() {
    return {
      setFileAttachment:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs }).run();
        },
    };
  },
});
