import { Node, mergeAttributes } from "@tiptap/core";

export type FileResolveResult = { src: string; name?: string; size?: number };
export type FileResolver = (fileId: string) => Promise<FileResolveResult>;

export interface FileAttachmentOptions {
  HTMLAttributes: Record<string, unknown>;
  resolver: FileResolver | null;
  downloadBaseUrl: string;
}

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

/**
 * Open in a tab instead of forcing a download.
 *
 * This is the *client* half of the decision. The server half is the
 * `Content-Disposition` it sends, and the two have to agree: an extension left
 * out here takes the `else` branch below, which fetches the blob and clicks a
 * synthetic `<a download>` — a download no server header can talk it out of.
 * That is exactly how `.txt` opened while `.cpp` still downloaded.
 *
 * Source and testcase files are here because this editor is used by an online
 * judge, where reading someone's `.cpp` or peeking at an `.in` is the common
 * case and saving it to disk is the rare one.
 */
function isInlineable(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return [
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "svg",
    "html",
    "htm",
    // text · data
    "txt",
    "csv",
    "log",
    "md",
    "json",
    // testcase input/output
    "in",
    "out",
    "ans",
    // source
    "c",
    "cpp",
    "cc",
    "cxx",
    "h",
    "hpp",
    "py",
    "java",
    "cs",
    "js",
    "ts",
    "kt",
    "go",
    "rs",
  ].includes(ext);
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
    return { HTMLAttributes: {}, resolver: null, downloadBaseUrl: "/api/upload" };
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
        "display:flex;align-items:center;gap:10px;padding:8px 14px;margin:8px 0;border:1px solid var(--border, #e2e8f0);border-radius:8px;background:var(--muted, #f7fafc);cursor:default;max-width:400px;";

      const icon = document.createElement("span");
      icon.style.cssText = "font-size:22px;flex-shrink:0;line-height:1;";
      icon.textContent = getFileIcon(node.attrs.name);

      const nameEl = document.createElement("a");
      nameEl.textContent = node.attrs.name;
      nameEl.style.cssText =
        "flex:1;min-width:0;font-size:15px;font-weight:600;color:var(--primary, #4A7DAC);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;background:none;border:0;padding:0;text-align:left;font-family:inherit;";

      let resolvedSrc: string | null = null;
      let resolvedName: string = node.attrs.name;

      function getProxyUrl(): string | null {
        const fileId = node.attrs.fileId;
        if (!fileId) return null;
        const baseUrl = editor.storage.fileAttachment?.downloadBaseUrl || "/api/upload";
        return `${baseUrl}/${fileId}/download`;
      }

      // href/download가 있어야 브라우저 우클릭의 "다른 이름으로 링크 저장"이 실제 파일을
      // 가리킨다 — 없으면 현재 페이지 HTML이 저장된다.
      function updateHref() {
        const targetUrl = getProxyUrl() || resolvedSrc;
        if (!targetUrl) return;
        nameEl.href = targetUrl;
        nameEl.download = resolvedName;
      }
      updateHref();

      function handleClick(e: Event) {
        // 상위(ProseMirror 노드 선택 등) 간섭만 막는다. 기본 동작을 죽일지는 분기별로 정한다.
        e.stopPropagation();

        const targetUrl = getProxyUrl() || resolvedSrc;
        if (!targetUrl) {
          e.preventDefault();
          return;
        }

        if (isInlineable(resolvedName)) {
          // 새 탭으로 "보여주는" 분기는 <a download>의 기본 동작(저장)과 정반대이므로
          // 여기서만 기본 동작을 가로챈다.
          e.preventDefault();
          window.open(targetUrl, "_blank");
          return;
        }

        // 다운로드 분기는 preventDefault 하지 않고 <a href download> 네이티브 동작에 맡긴다.
        // 예전 방식(fetch → res.blob())은 파일 전체를 탭 메모리에 버퍼링한 뒤에야 저장을
        // 시작해서, 381MB 첨부에서 클릭 후 수 분간 아무 반응이 없었다 — 진행률도 없고
        // 브라우저 다운로드 목록에도 안 떴다. 네이티브 다운로드는 클릭 즉시 다운로드
        // 관리자로 넘어가 디스크로 스트리밍되므로 대기도, 탭 메모리 점유도 없다.
        // href/download는 updateHref()가 같은 우선순위(proxy → resolvedSrc)로 이미 세팅한다.
      }

      nameEl.addEventListener("click", handleClick);
      nameEl.addEventListener("mousedown", (e) => e.stopPropagation());

      const sizeEl = document.createElement("span");
      sizeEl.style.cssText =
        "flex-shrink:0;font-size:12px;color:var(--muted-foreground, #718096);white-space:nowrap;";

      // URL이 있으면 바로 표시
      if (node.attrs.src) {
        resolvedSrc = node.attrs.src;
        updateHref();
        if (node.attrs.size) sizeEl.textContent = formatFileSize(node.attrs.size);
      } else if (node.attrs.fileId) {
        // fileId만 있어도 proxy URL로 다운로드 가능 — 버튼은 항상 활성.
        // resolver가 있으면 이름/크기 메타데이터를 채운다.
        const resolver = editor.storage.fileAttachment?.resolver as FileResolver | undefined;
        if (resolver) {
          sizeEl.textContent = "loading...";
          resolver(node.attrs.fileId)
            .then((result) => {
              resolvedSrc = result.src;
              if (result.name) {
                resolvedName = result.name;
                nameEl.textContent = result.name;
                icon.textContent = getFileIcon(result.name);
              }
              updateHref();
              sizeEl.textContent = result.size ? formatFileSize(result.size) : "";
            })
            .catch(() => {
              sizeEl.textContent = "";
            });
        }
      }

      dom.appendChild(icon);
      dom.appendChild(nameEl);
      dom.appendChild(sizeEl);

      if (editor.isEditable) {
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "\u00D7";
        del.style.cssText =
          "flex-shrink:0;width:20px;height:20px;border:none;background:transparent;color:var(--muted-foreground, #718096);font-size:14px;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;";
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
      resolver: this.options.resolver as FileResolver | null,
      downloadBaseUrl: this.options.downloadBaseUrl as string,
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
