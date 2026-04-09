import { Node, mergeAttributes } from "@tiptap/core";

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, unknown>;
}

export type FileResolveResult = { src: string; name?: string; size?: number };
export type FileResolver = (fileId: string) => Promise<FileResolveResult>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (attrs: {
        src?: string;
        fileId?: string;
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

function isInlineable(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
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
      fileId: { default: null },
      name: { default: "\uD30C\uC77C" },
      size: { default: null },
    };
  },

  parseHTML() {
    return [
      // 하이브리드: data-file-id + data-file-src
      {
        tag: "div[data-file-id]",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            fileId: el.getAttribute("data-file-id"),
            src: el.getAttribute("data-file-src") || null,
            name: el.getAttribute("data-file-name") || "\uD30C\uC77C",
            size: el.getAttribute("data-file-size")
              ? Number(el.getAttribute("data-file-size"))
              : null,
          };
        },
      },
      // URL 직접 방식 (data-file-src만)
      {
        tag: "div[data-file-src]",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            src: el.getAttribute("data-file-src"),
            fileId: null,
            name: el.getAttribute("data-file-name") || "\uD30C\uC77C",
            size: el.getAttribute("data-file-size")
              ? Number(el.getAttribute("data-file-size"))
              : null,
          };
        },
      },
      // 레거시: <tiptap-file id="X">
      {
        tag: "tiptap-file",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            fileId: el.getAttribute("id") || null,
            src: null,
            name: el.textContent?.trim() || "\uD30C\uC77C",
            size: null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, string> = {};
    if (HTMLAttributes.fileId) attrs["data-file-id"] = HTMLAttributes.fileId;
    if (HTMLAttributes.src) attrs["data-file-src"] = HTMLAttributes.src;
    attrs["data-file-name"] = HTMLAttributes.name || "\uD30C\uC77C";
    if (HTMLAttributes.size) attrs["data-file-size"] = String(HTMLAttributes.size);
    return ["div", mergeAttributes(this.options.HTMLAttributes, attrs)];
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
      nameEl.textContent = node.attrs.name;
      nameEl.style.cssText =
        "display:block;font-size:13px;font-weight:600;color:var(--primary, #4A7DAC);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;";

      let resolvedSrc: string | null = null;
      let resolvedName: string = node.attrs.name;

      function getProxyUrl(): string | null {
        const fileId = node.attrs.fileId;
        if (!fileId) return null;
        const baseUrl = editor.storage.fileAttachment?.downloadBaseUrl || "/api/upload";
        return `${baseUrl}/${fileId}/download`;
      }

      function handleClick(e: Event) {
        e.preventDefault();
        const proxyUrl = getProxyUrl();
        const targetUrl = proxyUrl || resolvedSrc;
        if (!targetUrl) return;

        if (isInlineable(resolvedName)) {
          window.open(targetUrl, "_blank");
        } else {
          fetch(targetUrl)
            .then((res) => res.blob())
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = resolvedName;
              a.click();
              URL.revokeObjectURL(url);
            });
        }
      }

      nameEl.addEventListener("click", handleClick);

      const sizeEl = document.createElement("span");
      sizeEl.style.cssText =
        "font-size:11px;color:var(--muted-foreground, #718096);";

      // URL이 있으면 바로 표시
      if (node.attrs.src) {
        resolvedSrc = node.attrs.src;
        nameEl.href = node.attrs.src;
        if (node.attrs.size) sizeEl.textContent = formatFileSize(node.attrs.size);
      } else if (node.attrs.fileId) {
        // ID만 있으면 resolver로 해결 시도
        nameEl.href = "#";
        nameEl.style.pointerEvents = "none";
        sizeEl.textContent = "loading...";

        const resolver = editor.storage.fileAttachment?.resolver as FileResolver | undefined;
        if (resolver) {
          resolver(node.attrs.fileId)
            .then((result) => {
              resolvedSrc = result.src;
              nameEl.href = result.src;
              nameEl.style.pointerEvents = "";
              if (result.name) {
                resolvedName = result.name;
                nameEl.textContent = result.name;
                icon.textContent = getFileIcon(result.name);
              }
              sizeEl.textContent = result.size ? formatFileSize(result.size) : "";
            })
            .catch(() => {
              sizeEl.textContent = "resolve failed";
            });
        } else {
          sizeEl.textContent = `ID: ${node.attrs.fileId}`;
        }
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

  addStorage() {
    return {
      resolver: null as FileResolver | null,
      downloadBaseUrl: "/api/upload" as string,
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
