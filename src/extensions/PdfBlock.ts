import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { getPdfJs } from "../utils/pdf";
import { attachResize } from "../utils/resize";
import type { FileResolver } from "./FileAttachment";

export const PdfBlock = TiptapNode.create({
  name: "pdfBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      fileId: { default: null },
      name: { default: "PDF" },
      width: { default: null },
      // 헤더에 보여줄 이름. `null` 이면 `name`(파일명)을 쓴다 — 옛 문서가 그대로 동작한다.
      label: { default: null },
    };
  },

  parseHTML() {
    return [
      // 하이브리드: data-pdf-id + data-pdf-src
      {
        tag: "div[data-pdf-id]",
        getAttrs: (dom: HTMLElement) => ({
          fileId: dom.getAttribute("data-pdf-id"),
          src: dom.getAttribute("data-pdf-src") || null,
          name: dom.getAttribute("data-pdf-name") || "PDF",
          width:
            dom.getAttribute("data-pdf-width") || dom.style?.width || null,
          label: dom.getAttribute("data-pdf-label") || null,
        }),
      },
      // URL 직접 방식
      {
        tag: "div[data-pdf-src]",
        getAttrs: (dom: HTMLElement) => ({
          src: dom.getAttribute("data-pdf-src"),
          fileId: null,
          name: dom.getAttribute("data-pdf-name") || "PDF",
          width:
            dom.getAttribute("data-pdf-width") || dom.style?.width || null,
          label: dom.getAttribute("data-pdf-label") || null,
        }),
      },
      // 레거시: <embed type="application/pdf">
      {
        tag: 'embed[type="application/pdf"]',
        getAttrs: (dom: HTMLElement) => {
          const src = dom.getAttribute("src") || "";
          const name = src.split("/").pop()?.replace(/[?#].*$/, "") || "PDF";
          return { src, fileId: null, name, width: null, label: null };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, string> = {};
    if (HTMLAttributes.fileId) attrs["data-pdf-id"] = HTMLAttributes.fileId;
    if (HTMLAttributes.src) attrs["data-pdf-src"] = HTMLAttributes.src;
    attrs["data-pdf-name"] = HTMLAttributes.name || "PDF";
    // ⚠️ 값이 없으면 속성을 아예 뺀다 — 옛 문서와 출력이 구분되지 않게.
    if (HTMLAttributes.label) attrs["data-pdf-label"] = HTMLAttributes.label;
    if (HTMLAttributes.width) {
      attrs["data-pdf-width"] = HTMLAttributes.width;
      attrs["style"] = `width: ${HTMLAttributes.width}`;
    }
    return [
      "div",
      mergeAttributes(attrs),
      [
        "p",
        {},
        [
          "a",
          {
            href: HTMLAttributes.src || "#",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          `\u{1F4C4} ${HTMLAttributes.name || "PDF"} (PDF)`,
        ],
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let destroyed = false;
      let resizeObserver: ResizeObserver | null = null;
      let resizeTimeout: ReturnType<typeof setTimeout>;
      // 리사이즈가 `setNodeMarkup` 으로 attrs 를 되쓰기 때문에 **항상 최신 노드**여야 한다.
      // 클로저의 `node` 를 쓰면 그 사이의 다른 속성 변경을 리사이즈가 되돌린다.
      let currentNode = node;
      let detachResize: (() => void) | null = null;

      const dom = document.createElement("div");
      dom.classList.add("my-2");
      dom.contentEditable = "false";
      dom.setAttribute("data-type", "pdfBlock");
      dom.setAttribute("data-drag-handle", "");
      dom.setAttribute("data-node-view-wrapper", "");
      dom.style.position = "relative";
      dom.style.boxSizing = "border-box";
      dom.style.maxWidth = "100%";
      if (node.attrs.width) dom.style.width = node.attrs.width;

      const wrapper = document.createElement("div");
      wrapper.className =
        "border rounded-lg overflow-hidden bg-muted/30 transition-shadow";
      wrapper.style.borderColor = "var(--border)";
      dom.appendChild(wrapper);

      // 리사이즈 핸들 (편집 가능 모드에서만)
      if (editor.isEditable) {
        detachResize = attachResize({
          dom,
          editor,
          getPos,
          getNode: () => currentNode,
          axis: "x",
          label: "PDF 너비 조절",
        });
      }

      // Header
      const header = document.createElement("div");
      // ⚠️ `justify-between` 이 아니라 spacer 로 민다. 이름칸이 넓어져도 오른쪽 버튼이
      //    밀려나지 않는다.
      header.className =
        "flex items-center gap-2 px-3 py-1 border-b border-border select-none";
      header.style.background = "var(--muted)";
      wrapper.appendChild(header);

      const cleanName = (raw: string | null | undefined) =>
        (raw || "").replace(/[?#].*$/, "").trim() || "PDF";

      /**
       * 헤더 표시 이름.
       *
       * ⚠️ **표시 전용이다.** 다운로드 파일명은 계속 `name` 을 쓴다 — 표시 이름을
       *    `1강 자료` 로 바꿨다고 확장자 없는 파일이 내려가면 안 된다.
       */
      let resolvedName: string | null = null;
      const fallbackName = () =>
        cleanName(resolvedName ?? (currentNode.attrs.name as string | null));
      const displayName = () => {
        const label = currentNode.attrs.label;
        const trimmed = typeof label === "string" ? label.trim() : "";
        return trimmed || fallbackName();
      };

      let nameSpan: HTMLSpanElement | null = null;
      let nameInput: HTMLInputElement | null = null;

      /** 노드 속성을 되쓴다. 리사이즈(`attachResize`)와 **같은 방식**. */
      const setAttrs = (patch: Record<string, unknown>) => {
        const pos = getPos();
        if (pos == null) return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            ...patch,
          })
        );
      };

      /** 입력칸이 글자 길이만큼만 차지하게 한다(빈 상자가 넓게 보이지 않도록). */
      const fitInput = () => {
        if (!nameInput) return;
        nameInput.size = Math.min(40, Math.max(6, nameInput.value.length + 1));
      };

      /** 표시 이름을 화면에 반영한다. 입력 중일 때는 건드리지 않는다. */
      const syncName = () => {
        const next = displayName();
        if (nameSpan) nameSpan.textContent = next;
        if (
          nameInput &&
          document.activeElement !== nameInput &&
          nameInput.value !== next
        ) {
          nameInput.value = next;
        }
        fitInput();
      };

      if (editor.isEditable) {
        // 그 자리에서 이름을 고쳐 쓴다. 확정은 blur / Enter, 되돌리기는 Escape.
        nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className =
          // ⚠️ `select-text` — 헤더가 `select-none` 이라 이 칸까지 선택이 막힌다. 이름을
          //    드래그해 고쳐 쓰려면 여기만 되돌려야 한다.
          /*
           * ⚠️ 평소에도 **입력칸으로 보여야 한다**(사용자 지적). 예전엔 테두리·면이 투명이라
           *    hover 하기 전에는 그냥 글자였고, 고칠 수 있다는 걸 알 방법이 없었다.
           *    헤더 면(`--muted`) 위에 `--background` 면 + 1px 테두리를 두면 한눈에 칸으로 읽힌다.
           */
          "pdf-name-input select-text text-xs text-muted-foreground min-w-0 bg-background rounded px-1.5 py-0.5 border border-border hover:border-ring focus:border-ring focus:text-foreground outline-none transition-colors";
        nameInput.style.maxWidth = "220px";
        nameInput.contentEditable = "false";
        nameInput.draggable = false;
        // ProseMirror 가 이 칸의 키/포인터를 가져가지 않도록 하는 표식(`stopEvent`).
        nameInput.setAttribute("data-pdf-control", "");
        nameInput.title = "표시 이름 (비우면 파일명)";
        nameInput.setAttribute("aria-label", "PDF 표시 이름");
        nameInput.value = displayName();
        fitInput();

        /** 빈칸이거나 파일명과 같으면 `label: null` — 다시 파일명을 따라간다. */
        const commitLabel = () => {
          if (!nameInput) return;
          const typed = nameInput.value.trim();
          const next = typed && typed !== fallbackName() ? typed : null;
          const current = (currentNode.attrs.label as string | null) ?? null;
          if (next !== current) setAttrs({ label: next });
          nameInput.value = next || fallbackName();
          fitInput();
        };

        nameInput.addEventListener("input", fitInput);

        nameInput.addEventListener("keydown", (e) => {
          // tiptap 이 단축키·타이핑을 가로채면 이 칸에 글자가 안 들어간다.
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commitLabel();
            nameInput?.blur();
          } else if (e.key === "Escape") {
            e.preventDefault();
            // 되돌린 뒤 blur — 값이 현재와 같아져 blur 의 커밋은 무시된다.
            if (nameInput) nameInput.value = displayName();
            nameInput?.blur();
          }
        });
        nameInput.addEventListener("mousedown", (e) => e.stopPropagation());
        nameInput.addEventListener("blur", commitLabel);
        header.appendChild(nameInput);
      } else {
        nameSpan = document.createElement("span");
        nameSpan.className =
          "text-xs text-muted-foreground truncate select-none min-w-0";
        nameSpan.style.maxWidth = "220px";
        nameSpan.style.userSelect = "none";
        nameSpan.textContent = displayName();
        header.appendChild(nameSpan);
      }

      const spacer = document.createElement("div");
      spacer.className = "flex-1";
      header.appendChild(spacer);

      // 너비 프리셋 (편집 가능 모드에서만)
      const PRESET_BASE =
        "px-1.5 py-0.5 rounded text-xs leading-none tabular-nums transition-colors select-none";
      const PRESET_IDLE = `${PRESET_BASE} text-muted-foreground hover:bg-background pdf-width-preset`;
      const PRESET_ACTIVE = `${PRESET_BASE} bg-primary text-primary-foreground pdf-width-preset is-active`;
      const presetButtons: { value: string; el: HTMLButtonElement }[] = [];

      if (editor.isEditable) {
        const presetGroup = document.createElement("div");
        presetGroup.className = "flex items-center gap-0.5";
        // ⚠️ 25% 는 뺐다 — 그 폭이면 PDF 글자를 읽을 수 없어 고를 이유가 없다(사용자 결정).
        for (const value of ["50%", "75%", "100%"]) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = PRESET_IDLE;
          btn.title = `너비 ${value}`;
          btn.textContent = value;
          /*
           * ⚠️ `mousedown` 에서 기본 동작을 막는다. 안 막으면 브라우저가 여기서 텍스트 선택을
           * 시작하고, 곧바로 `setAttrs` 가 NodeView 를 다시 그리면서 그 선택이 **헤더 전체**로
           * 번져 파일명·버튼이 통째로 파랗게 칠해졌다(사용자 지적).
           * 클릭 자체는 `click` 에서 처리하므로 동작에는 영향이 없다.
           */
          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
          });
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            setAttrs({ width: value });
          });
          presetGroup.appendChild(btn);
          presetButtons.push({ value, el: btn });
        }
        header.appendChild(presetGroup);
      }

      /** 현재 `width` 와 같은 프리셋을 눌린 상태로 만든다. */
      const syncPresets = (width: string | null) => {
        for (const { value, el } of presetButtons) {
          el.className = width === value ? PRESET_ACTIVE : PRESET_IDLE;
          el.setAttribute("aria-pressed", width === value ? "true" : "false");
        }
      };
      syncPresets((node.attrs.width as string | null) ?? null);

      const btnGroup = document.createElement("div");
      btnGroup.className = "flex items-center gap-1";
      header.appendChild(btnGroup);

      const downloadLink = document.createElement("a");
      downloadLink.rel = "noopener noreferrer";
      downloadLink.setAttribute("download", cleanName(node.attrs.name));
      downloadLink.className =
        "p-1 rounded hover:bg-muted transition-colors text-muted-foreground cursor-pointer";
      downloadLink.title = "\uB2E4\uC6B4\uB85C\uB4DC";
      downloadLink.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      downloadLink.addEventListener("click", async (e) => {
        if (!downloadLink.href) return;
        e.preventDefault();
        const fileName =
          downloadLink.getAttribute("download") || cleanName(node.attrs.name);
        try {
          const res = await fetch(downloadLink.href);
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
          window.open(downloadLink.href, "_blank", "noopener,noreferrer");
        }
      });
      btnGroup.appendChild(downloadLink);

      const openLink = document.createElement("a");
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      openLink.className =
        "p-1 rounded hover:bg-muted transition-colors text-muted-foreground";
      openLink.title = "\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30";
      openLink.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
      btnGroup.appendChild(openLink);

      if (editor.isEditable) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className =
          "p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive";
        deleteBtn.title = "\uC0AD\uC81C";
        deleteBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
        deleteBtn.addEventListener("click", () => {
          const pos = getPos();
          if (pos != null) {
            editor.commands.deleteRange({
              from: pos,
              to: pos + node.nodeSize,
            });
          }
        });
        btnGroup.appendChild(deleteBtn);
      }

      // Content area
      const contentArea = document.createElement("div");
      contentArea.className = "flex items-center justify-center";
      wrapper.appendChild(contentArea);

      const canvas = document.createElement("canvas");
      canvas.className = "shadow-sm";
      contentArea.appendChild(canvas);

      const loadingDiv = document.createElement("div");
      loadingDiv.className = "flex items-center justify-center p-8";
      loadingDiv.innerHTML =
        '<p class="text-sm text-muted-foreground animate-pulse">PDF \uB85C\uB529 \uC911...</p>';
      contentArea.appendChild(loadingDiv);
      canvas.style.display = "none";

      let navDiv: HTMLDivElement | null = null;
      let currentPage = 1;
      let totalPages = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pdfDoc: any = null;
      let rendering = false;

      async function renderPage() {
        if (!pdfDoc || rendering || destroyed) return;
        rendering = true;
        try {
          const pageObj = await pdfDoc.getPage(currentPage);
          if (destroyed) return;
          const unscaledViewport = pageObj.getViewport({ scale: 1 });
          const availableWidth = contentArea.clientWidth;
          if (availableWidth <= 0) {
            rendering = false;
            return;
          }
          const scale = availableWidth / unscaledViewport.width;
          const viewport = pageObj.getViewport({ scale });
          const dpr = window.devicePixelRatio || 1;
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            rendering = false;
            return;
          }
          ctx.resetTransform();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(dpr, dpr);
          await pageObj.render({ canvasContext: ctx, viewport }).promise;
        } finally {
          rendering = false;
        }
        if (navDiv) {
          const pageSpan = navDiv.querySelector(".page-counter");
          if (pageSpan)
            pageSpan.textContent = `${currentPage} / ${totalPages}`;
        }
      }

      async function loadPdf(src: string) {
        try {
          const pdfjsLib = await getPdfJs();
          if (destroyed) return;
          const loadingTask = pdfjsLib.getDocument(src);
          pdfDoc = await loadingTask.promise;
          if (destroyed) return;
          totalPages = pdfDoc.numPages;

          loadingDiv.style.display = "none";
          canvas.style.display = "";

          if (totalPages > 1) {
            navDiv = document.createElement("div");
            navDiv.className =
              "flex items-center justify-center gap-4 px-3 py-1 border-t border-border";
            navDiv.style.background = "var(--muted)";
            const prevBtn = document.createElement("button");
            prevBtn.type = "button";
            prevBtn.className =
              "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30 text-foreground";
            prevBtn.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
            prevBtn.addEventListener("click", () => {
              if (currentPage > 1) {
                currentPage--;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
                renderPage();
              }
            });
            navDiv.appendChild(prevBtn);

            const pageSpan = document.createElement("span");
            pageSpan.className = "text-sm tabular-nums page-counter select-none";
            pageSpan.style.userSelect = "none";
            pageSpan.textContent = `1 / ${totalPages}`;
            navDiv.appendChild(pageSpan);

            const nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.className =
              "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30 text-foreground";
            nextBtn.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
            nextBtn.addEventListener("click", () => {
              if (currentPage < totalPages) {
                currentPage++;
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
                renderPage();
              }
            });
            navDiv.appendChild(nextBtn);
            wrapper.appendChild(navDiv);
          }

          renderPage();

          resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(renderPage, 100);
          });
          resizeObserver.observe(contentArea);
        } catch {
          loadingDiv.innerHTML =
            '<p class="text-sm text-muted-foreground">PDF\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
        }
      }

      // URL 해결 후 PDF 로드
      function getProxyUrl(fileId: string): string {
        const baseUrl = editor.storage.fileAttachment?.downloadBaseUrl || "/api/upload";
        return `${baseUrl}/${fileId}/download`;
      }

      if (node.attrs.src) {
        if (node.attrs.fileId) {
          // fileId 있으면 프록시 URL 사용 (경로 숨김)
          const proxyUrl = getProxyUrl(node.attrs.fileId);
          openLink.href = proxyUrl;
          downloadLink.href = proxyUrl;
          loadPdf(proxyUrl);
        } else {
          openLink.href = node.attrs.src;
          downloadLink.href = node.attrs.src;
          loadPdf(node.attrs.src);
        }
      } else if (node.attrs.fileId) {
        const proxyUrl = getProxyUrl(node.attrs.fileId);
        openLink.href = proxyUrl;
        downloadLink.href = proxyUrl;
        // resolver로 이름 획득
        const resolver = editor.storage.fileAttachment?.resolver as FileResolver | undefined;
        if (resolver) {
          resolver(node.attrs.fileId)
            .then((result) => {
              if (result.name) {
                // 다운로드 파일명은 항상 실제 파일명. 표시는 `label` 이 있으면 그쪽이 이긴다.
                resolvedName = result.name;
                downloadLink.setAttribute("download", result.name);
                syncName();
              }
            })
            .catch(() => {});
        }
        loadPdf(proxyUrl);
      }

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "pdfBlock") return false;
          const newWidth = updatedNode.attrs.width as string | null;
          if (newWidth !== (currentNode.attrs.width as string | null)) {
            dom.style.width = newWidth || "";
          }
          currentNode = updatedNode;
          syncPresets(newWidth ?? null);
          syncName();
          return true;
        },
        // 이름 입력칸 위의 이벤트는 ProseMirror 가 가로채면 안 된다(CardBlock 과 같은 방식).
        stopEvent: (event: Event) => {
          const target = event.target;
          return target instanceof Element && !!target.closest("[data-pdf-control]");
        },
        selectNode: () => {},
        deselectNode: () => {},
        destroy: () => {
          destroyed = true;
          clearTimeout(resizeTimeout);
          resizeObserver?.disconnect();
          detachResize?.();
        },
      };
    };
  },

  addStorage() {
    return {};
  },
});
