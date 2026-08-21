import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { getPdfJs } from "../utils/pdf";
import { attachResize } from "../utils/resize";
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
        };
    },
    parseHTML() {
        return [
            // 하이브리드: data-pdf-id + data-pdf-src
            {
                tag: "div[data-pdf-id]",
                getAttrs: (dom) => ({
                    fileId: dom.getAttribute("data-pdf-id"),
                    src: dom.getAttribute("data-pdf-src") || null,
                    name: dom.getAttribute("data-pdf-name") || "PDF",
                    width: dom.getAttribute("data-pdf-width") || dom.style?.width || null,
                }),
            },
            // URL 직접 방식
            {
                tag: "div[data-pdf-src]",
                getAttrs: (dom) => ({
                    src: dom.getAttribute("data-pdf-src"),
                    fileId: null,
                    name: dom.getAttribute("data-pdf-name") || "PDF",
                    width: dom.getAttribute("data-pdf-width") || dom.style?.width || null,
                }),
            },
            // 레거시: <embed type="application/pdf">
            {
                tag: 'embed[type="application/pdf"]',
                getAttrs: (dom) => {
                    const src = dom.getAttribute("src") || "";
                    const name = src.split("/").pop()?.replace(/[?#].*$/, "") || "PDF";
                    return { src, fileId: null, name, width: null };
                },
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const attrs = {};
        if (HTMLAttributes.fileId)
            attrs["data-pdf-id"] = HTMLAttributes.fileId;
        if (HTMLAttributes.src)
            attrs["data-pdf-src"] = HTMLAttributes.src;
        attrs["data-pdf-name"] = HTMLAttributes.name || "PDF";
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
            let resizeObserver = null;
            let resizeTimeout;
            // 리사이즈가 `setNodeMarkup` 으로 attrs 를 되쓰기 때문에 **항상 최신 노드**여야 한다.
            // 클로저의 `node` 를 쓰면 그 사이의 다른 속성 변경을 리사이즈가 되돌린다.
            let currentNode = node;
            let detachResize = null;
            const dom = document.createElement("div");
            dom.classList.add("my-4");
            dom.contentEditable = "false";
            dom.setAttribute("data-type", "pdfBlock");
            dom.setAttribute("data-drag-handle", "");
            dom.setAttribute("data-node-view-wrapper", "");
            dom.style.position = "relative";
            dom.style.boxSizing = "border-box";
            dom.style.maxWidth = "100%";
            if (node.attrs.width)
                dom.style.width = node.attrs.width;
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
            header.className =
                "flex items-center justify-between px-4 py-2 border-b border-border";
            header.style.background = "var(--muted)";
            wrapper.appendChild(header);
            const cleanName = (raw) => (raw || "").replace(/[?#].*$/, "").trim() || "PDF";
            const nameSpan = document.createElement("span");
            nameSpan.className = "text-xs text-muted-foreground truncate select-none";
            nameSpan.style.maxWidth = "200px";
            nameSpan.style.userSelect = "none";
            nameSpan.textContent = cleanName(node.attrs.name);
            header.appendChild(nameSpan);
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
                if (!downloadLink.href)
                    return;
                e.preventDefault();
                const fileName = downloadLink.getAttribute("download") || cleanName(node.attrs.name);
                try {
                    const res = await fetch(downloadLink.href);
                    if (!res.ok)
                        throw new Error(String(res.status));
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
                catch {
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
            let navDiv = null;
            let currentPage = 1;
            let totalPages = 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let pdfDoc = null;
            let rendering = false;
            async function renderPage() {
                if (!pdfDoc || rendering || destroyed)
                    return;
                rendering = true;
                try {
                    const pageObj = await pdfDoc.getPage(currentPage);
                    if (destroyed)
                        return;
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
                }
                finally {
                    rendering = false;
                }
                if (navDiv) {
                    const pageSpan = navDiv.querySelector(".page-counter");
                    if (pageSpan)
                        pageSpan.textContent = `${currentPage} / ${totalPages}`;
                }
            }
            async function loadPdf(src) {
                try {
                    const pdfjsLib = await getPdfJs();
                    if (destroyed)
                        return;
                    const loadingTask = pdfjsLib.getDocument(src);
                    pdfDoc = await loadingTask.promise;
                    if (destroyed)
                        return;
                    totalPages = pdfDoc.numPages;
                    loadingDiv.style.display = "none";
                    canvas.style.display = "";
                    if (totalPages > 1) {
                        navDiv = document.createElement("div");
                        navDiv.className =
                            "flex items-center justify-center gap-4 px-4 py-2 border-t border-border";
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
                }
                catch {
                    loadingDiv.innerHTML =
                        '<p class="text-sm text-muted-foreground">PDF\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
                }
            }
            // URL 해결 후 PDF 로드
            function getProxyUrl(fileId) {
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
                }
                else {
                    openLink.href = node.attrs.src;
                    downloadLink.href = node.attrs.src;
                    loadPdf(node.attrs.src);
                }
            }
            else if (node.attrs.fileId) {
                const proxyUrl = getProxyUrl(node.attrs.fileId);
                openLink.href = proxyUrl;
                downloadLink.href = proxyUrl;
                // resolver로 이름 획득
                const resolver = editor.storage.fileAttachment?.resolver;
                if (resolver) {
                    resolver(node.attrs.fileId)
                        .then((result) => {
                        if (result.name) {
                            nameSpan.textContent = result.name;
                            downloadLink.setAttribute("download", result.name);
                        }
                    })
                        .catch(() => { });
                }
                loadPdf(proxyUrl);
            }
            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== "pdfBlock")
                        return false;
                    const newWidth = updatedNode.attrs.width;
                    if (newWidth !== currentNode.attrs.width) {
                        dom.style.width = newWidth || "";
                    }
                    currentNode = updatedNode;
                    return true;
                },
                selectNode: () => { },
                deselectNode: () => { },
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
