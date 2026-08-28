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

      const icon = (paths: string) =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

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

      const frame = document.createElement("div");
      frame.className = "pdf-frame";
      dom.appendChild(frame);

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

      /*
       * 조작부는 판 **안에** 떠 있다. 통째로 `data-pdf-control` 이라 `stopEvent` 가
       * ProseMirror 를 막아 준다 — 버튼·입력칸이 선택/타이핑에 가로채이지 않는다.
       * 빈 영역은 `pointer-events: none` 이라 그 위로 드래그·클릭이 그대로 통과한다.
       */
      const overlay = document.createElement("div");
      overlay.className = "pdf-overlay";
      overlay.setAttribute("data-pdf-control", "");
      // 판에는 캔버스·상태문구 **뒤에** 붙인다(아래) — 여기서는 만들어 채우기만 한다.

      const endCluster = document.createElement("div");
      endCluster.className = "pdf-cluster pdf-cluster-end";
      overlay.appendChild(endCluster);

      const cleanName = (raw: string | null | undefined) =>
        (raw || "").replace(/[?#].*$/, "").trim() || "PDF";

      /*
       * ⚠️ **표시 이름은 화면에서 뺐다**(사용자 결정) — 편집용 입력칸도, 읽기용 글자도
       * 없다. 판 위에 이름표가 늘 붙어 있는 게 소음이었다.
       *
       * 그래도 `label` 속성 자체는 **스키마에 남긴다.** 이미 이름을 지정해 둔 문서가
       * 있고, 속성을 지우면 그 문서를 한 번 열었다 저장하는 것만으로 값이 조용히
       * 사라진다. 지금은 아무도 읽지 않지만 왕복은 그대로 된다.
       *
       * 다운로드 파일명은 원래부터 `label` 이 아니라 `name` 이다 — 표시 이름을
       * `1강 자료` 로 바꿨다고 확장자 없는 파일이 내려가면 안 되기 때문.
       */

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

      // 너비 프리셋 (편집 가능 모드에서만)
      const PRESET_IDLE = "pdf-preset";
      const PRESET_ACTIVE = "pdf-preset is-active";
      const presetButtons: { value: string; el: HTMLButtonElement }[] = [];

      if (editor.isEditable) {
        /*
         * ⚠️ 프리셋은 **문서에 저장되는 폭**이지 확대가 아니다. 옆의 다운로드·새 탭과
         * 성격이 달라(저장됨 vs 그때뿐) 구분선으로 갈라 둔다 — 안 그러면 "100% 누르면
         * 확대되겠지" 로 읽힌다.
         */
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
          endCluster.appendChild(btn);
          presetButtons.push({ value, el: btn });
        }
        const divider = document.createElement("div");
        divider.className = "pdf-divider";
        endCluster.appendChild(divider);
      }

      /** 현재 `width` 와 같은 프리셋을 눌린 상태로 만든다. */
      const syncPresets = (width: string | null) => {
        for (const { value, el } of presetButtons) {
          el.className = width === value ? PRESET_ACTIVE : PRESET_IDLE;
          el.setAttribute("aria-pressed", width === value ? "true" : "false");
        }
      };
      syncPresets((node.attrs.width as string | null) ?? null);

      const downloadLink = document.createElement("a");
      downloadLink.rel = "noopener noreferrer";
      downloadLink.setAttribute("download", cleanName(node.attrs.name));
      downloadLink.className = "pdf-ctl";
      downloadLink.title = "\uB2E4\uC6B4\uB85C\uB4DC";
      downloadLink.innerHTML = icon(
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
      );
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
      endCluster.appendChild(downloadLink);

      /*
       * \uC804\uCCB4\uD654\uBA74 \uB300\uC2E0 **\uC0C8 \uD0ED**\uC774\uB2E4(\uC0AC\uC6A9\uC790 \uACB0\uC815). \uBE0C\uB77C\uC6B0\uC800 \uAE30\uBCF8 PDF \uBDF0\uC5B4\uAC00 \uCC3D \uC804\uCCB4\uB97C \uC4F0\uACE0
       * \uAC80\uC0C9\u00B7\uC778\uC1C4\u00B7\uD655\uB300\uAE4C\uC9C0 \uC5B9\uD600 \uC624\uBBC0\uB85C, \uC6B0\uB9AC\uAC00 \uB9CC\uB4E0 \uC804\uCCB4\uD654\uBA74\uBCF4\uB2E4 \uC77D\uAE30\uC5D0 \uB0AB\uB2E4.
       */
      const openLink = document.createElement("a");
      openLink.target = "_blank";
      openLink.rel = "noopener noreferrer";
      openLink.className = "pdf-ctl";
      openLink.title = "\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30";
      openLink.innerHTML = icon(
        '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
      );
      endCluster.appendChild(openLink);

      if (editor.isEditable) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "pdf-ctl pdf-ctl-danger";
        deleteBtn.title = "\uC0AD\uC81C";
        deleteBtn.innerHTML = icon(
          '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'
        );
        deleteBtn.addEventListener("click", () => {
          const pos = getPos();
          if (pos != null) {
            editor.commands.deleteRange({
              from: pos,
              to: pos + currentNode.nodeSize,
            });
          }
        });
        endCluster.appendChild(deleteBtn);
      }

      const canvas = document.createElement("canvas");
      frame.appendChild(canvas);

      const statusDiv = document.createElement("div");
      statusDiv.className = "pdf-status";
      statusDiv.textContent = "PDF \uB85C\uB529 \uC911...";
      frame.appendChild(statusDiv);
      canvas.style.display = "none";

      // \uC870\uC791\uBD80\uB294 \uB9C8\uC9C0\uB9C9 \u2014 `position:absolute` \uB77C \uC21C\uC11C\uC640 \uBB34\uAD00\uD558\uAC8C \uC704\uC5D0 \uADF8\uB824\uC9C0\uC9C0\uB9CC,
      // \uB0B4\uC6A9 \uB2E4\uC74C\uC5D0 \uC624\uB294 \uAC8C \uBCF4\uC870\uAE30\uC220\uC5D0\uAC8C\uB3C4 \uB9DE\uB294 \uC21C\uC11C\uB2E4.
      frame.appendChild(overlay);

      /* \u2500\u2500 \uD398\uC774\uC9C0 \uC774\uB3D9 \u2014 \uC88C\uC6B0 \uD654\uC0B4\uD45C + \uC544\uB798 \uAC00\uC6B4\uB370 \uCABD\uC218 \u2500\u2500 */
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "pdf-ctl pdf-nav pdf-nav-prev pdf-cluster";
      prevBtn.title = "\uC774\uC804 \uD398\uC774\uC9C0";
      prevBtn.setAttribute("aria-label", "\uC774\uC804 \uD398\uC774\uC9C0");
      prevBtn.innerHTML = icon('<path d="m15 18-6-6 6-6"/>');

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "pdf-ctl pdf-nav pdf-nav-next pdf-cluster";
      nextBtn.title = "\uB2E4\uC74C \uD398\uC774\uC9C0";
      nextBtn.setAttribute("aria-label", "\uB2E4\uC74C \uD398\uC774\uC9C0");
      nextBtn.innerHTML = icon('<path d="m9 18 6-6-6-6"/>');

      /*
       * \uD310\uC774 \uD654\uBA74\uBCF4\uB2E4 \uAE38 \uB54C \uC77D\uAE30 \uC870\uC791\uBD80\uAC00 \uB530\uB77C\uC624\uAC8C \uD558\uB294 \uB808\uC77C. `position: sticky` \uB77C
       * \uD310\uC744 \uC9C0\uB098\uB294 \uB3D9\uC548 \uD56D\uC0C1 \uBCF4\uC774\uB294 \uC601\uC5ED\uC5D0 \uBA38\uBB34\uB978\uB2E4. \uD310\uC774 \uD654\uBA74\uBCF4\uB2E4 \uC9E7\uC73C\uBA74
       * `max-height: 100%` \uAC00 \uB808\uC77C\uC744 \uD310 \uD06C\uAE30\uB85C \uC904\uC5EC \uC608\uC804\uACFC \uAC19\uC774 \uD310 \uAC00\uC6B4\uB370\u00b7\uBC11\uC5D0 \uB193\uC778\uB2E4.
       */
      const navRail = document.createElement("div");
      navRail.className = "pdf-nav-rail";

      const pageCluster = document.createElement("div");
      pageCluster.className = "pdf-cluster pdf-cluster-page";

      const pageBtn = document.createElement("button");
      pageBtn.type = "button";
      pageBtn.className = "pdf-page";
      pageBtn.title = "\uCABD \uBC88\uD638\uB85C \uC774\uB3D9";
      pageCluster.appendChild(pageBtn);

      /*
       * \uCABD\uC218\uB97C \uB20C\uB7EC **\uBC88\uD638\uB85C \uAC74\uB108\uB6F4\uB2E4.** \uC774\uAC8C \uC5C6\uC73C\uBA74 30\uCABD\uC9DC\uB9AC \uC790\uB8CC\uC5D0\uC11C \uB4A4\uB85C \uAC00\uB824\uBA74
       * \uD654\uC0B4\uD45C\uB97C 30\uBC88 \uB20C\uB7EC\uC57C \uD55C\uB2E4 \u2014 \uD398\uC774\uC9C0 \uB118\uAE40 \uBAA8\uB378\uC758 \uAC00\uC7A5 \uC544\uD508 \uC9C0\uC810\uC774\uB2E4.
       */
      const pageInput = document.createElement("input");
      pageInput.type = "text";
      pageInput.inputMode = "numeric";
      pageInput.className = "pdf-page-input";
      pageInput.setAttribute("aria-label", "\uCABD \uBC88\uD638");
      pageInput.style.display = "none";
      pageCluster.appendChild(pageInput);

      let currentPage = 1;
      let totalPages = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pdfDoc: any = null;
      let rendering = false;
      let renderQueued = false;

      /** 쪽수 표시와 화살표 비활성 상태를 현재 페이지에 맞춘다. */
      const syncPageUi = () => {
        pageBtn.textContent = `${currentPage} / ${totalPages}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
      };

      const goToPage = (next: number) => {
        const clamped = Math.min(totalPages, Math.max(1, next));
        if (clamped === currentPage) return;
        currentPage = clamped;
        syncPageUi();
        renderPage();
      };

      prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
      nextBtn.addEventListener("click", () => goToPage(currentPage + 1));

      const closePageInput = () => {
        pageInput.style.display = "none";
        pageBtn.style.display = "";
      };
      pageBtn.addEventListener("click", () => {
        pageInput.value = String(currentPage);
        pageBtn.style.display = "none";
        pageInput.style.display = "";
        pageInput.focus();
        pageInput.select();
      });
      pageInput.addEventListener("keydown", (e) => {
        // tiptap 이 단축키를 가로채면 숫자가 안 들어간다(이름칸과 같은 이유).
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          const parsed = Number.parseInt(pageInput.value, 10);
          if (Number.isFinite(parsed)) goToPage(parsed);
          closePageInput();
        } else if (e.key === "Escape") {
          e.preventDefault();
          closePageInput();
        }
      });
      pageInput.addEventListener("blur", closePageInput);

      /*
       * 화살표 키는 **조작부 안에 포커스가 있을 때만** 받는다. 블록 전체에서 가로채면
       * 편집 중 이 블록을 지나 위아래로 빠져나가는 길이 막힌다(atom 노드라 화살표가
       * ProseMirror 의 탈출 경로다). 넘김 버튼을 한 번 누르면 그때부터 키가 듣는다.
       */
      overlay.addEventListener("keydown", (e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        e.stopPropagation();
        goToPage(currentPage + (e.key === "ArrowLeft" ? -1 : 1));
      });

      /*
       * ⚠️ **그리는 중에 들어온 요청을 버리면 안 된다.** 예전엔 `if (rendering) return` 으로
       * 그냥 흘려보냈는데, 폭 프리셋이나 창 크기 변경이 **직전 렌더가 끝나기 전에** 오면
       * 그 요청이 통째로 사라져 캔버스가 옛 크기에 머문다(다음 렌더까지 아무도 다시
       * 부르지 않는다). 겹치면 한 번 예약해 뒀다가 끝나고 이어서 그린다.
       * pdf.js 는 같은 캔버스에 렌더가 겹치면 던지므로 **직렬화 자체는 유지**한다.
       */
      async function renderPage(): Promise<void> {
        if (!pdfDoc || destroyed) return;
        if (rendering) {
          renderQueued = true;
          return;
        }
        rendering = true;
        try {
          const pageObj = await pdfDoc.getPage(currentPage);
          if (destroyed) return;
          const unscaledViewport = pageObj.getViewport({ scale: 1 });
          const availableWidth = frame.clientWidth;
          if (availableWidth <= 0) return;
          /*
           * 폭에만 맞춘다 — **높이는 제한하지 않는다.**
           *
           * ⚠️ 한때 `min(폭맞춤, 0.78vh)` 로 한 장이 화면에 들어가게 했다가 되돌렸다.
           * A4 는 세로가 길어서 웬만한 창에서는 **높이 쪽이 항상 먼저 걸리고**, 그러면
           * 폭 프리셋 50%/75%/100% 가 **전부 같은 크기로 그려진다**(실측: 50% 도 100% 도
           * 캔버스 673px). 저자가 고른 폭이 무의미해지는 건 얻는 것보다 잃는 게 크다.
           * 판이 화면보다 길 때 조작부가 따라오게 하는 건 CSS(`.pdf-nav-rail`)가 맡는다.
           */
          const scale = availableWidth / unscaledViewport.width;
          const viewport = pageObj.getViewport({ scale });
          const dpr = window.devicePixelRatio || 1;
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.resetTransform();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(dpr, dpr);
          await pageObj.render({ canvasContext: ctx, viewport }).promise;
        } finally {
          rendering = false;
        }
        if (renderQueued && !destroyed) {
          renderQueued = false;
          await renderPage();
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

          statusDiv.style.display = "none";
          canvas.style.display = "";

          // \uD55C \uC7A5\uC9DC\uB9AC\uC5D4 \uB118\uAE40 \uC870\uC791\uC744 \uC544\uC608 \uBD99\uC774\uC9C0 \uC54A\uB294\uB2E4 \u2014 \uB204\uB97C \uC218 \uC5C6\uB294 \uBC84\uD2BC\uC740 \uC18C\uC74C\uC774\uB2E4.
          if (totalPages > 1) {
            navRail.appendChild(prevBtn);
            navRail.appendChild(nextBtn);
            navRail.appendChild(pageCluster);
            overlay.appendChild(navRail);
            syncPageUi();
          }

          renderPage();

          /*
           * \u26A0\uFE0F \uAD00\uCC30 \uB300\uC0C1\uC740 `dom` \uC774\uC9C0 \uD310\uC774 \uC544\uB2C8\uB2E4. \uD310\uC744 \uBCF4\uBA74 \uCE94\uBC84\uC2A4 \uB192\uC774\uAC00 \uBC14\uB014 \uB54C\uB9C8\uB2E4
           * \uB2E4\uC2DC \uBD88\uB824 \uB418\uBA39\uC784\uC774 \uC0DD\uAE34\uB2E4 \u2014 \uD3ED\uC740 `dom` \uC5D0\uC11C\uB9CC \uBC14\uB010\uB2E4.
           */
          resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(renderPage, 100);
          });
          resizeObserver.observe(dom);
        } catch {
          statusDiv.textContent = "PDF\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
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
                // \uB2E4\uC6B4\uB85C\uB4DC \uD30C\uC77C\uBA85\uC740 \uD56D\uC0C1 \uC2E4\uC81C \uD30C\uC77C\uBA85\uC774\uB2E4.
                downloadLink.setAttribute("download", result.name);
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
