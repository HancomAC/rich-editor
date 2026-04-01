import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { getPdfJs } from "../utils/pdf";
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
                getAttrs: (dom) => ({
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
        return ({ node, getPos, editor }) => {
            const dom = document.createElement("div");
            dom.classList.add("my-4");
            dom.contentEditable = "false";
            dom.setAttribute("data-drag-handle", "");
            const wrapper = document.createElement("div");
            wrapper.className =
                "border rounded-lg overflow-hidden bg-muted/30 transition-shadow";
            wrapper.style.borderColor = "var(--border)";
            dom.appendChild(wrapper);
            // Header
            const header = document.createElement("div");
            header.className =
                "flex items-center justify-between px-4 py-2 border-b border-border bg-background";
            wrapper.appendChild(header);
            const nameSpan = document.createElement("span");
            nameSpan.className =
                "text-xs text-muted-foreground truncate";
            nameSpan.style.maxWidth = "200px";
            nameSpan.textContent = node.attrs.name || "PDF \uBB38\uC11C";
            header.appendChild(nameSpan);
            const btnGroup = document.createElement("div");
            btnGroup.className = "flex items-center gap-1";
            header.appendChild(btnGroup);
            const openLink = document.createElement("a");
            openLink.href = node.attrs.src;
            openLink.target = "_blank";
            openLink.rel = "noopener noreferrer";
            openLink.className =
                "p-1 rounded hover:bg-muted transition-colors text-muted-foreground";
            openLink.title = "\uC0C8 \uD0ED\uC5D0\uC11C \uC5F4\uAE30";
            openLink.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
            btnGroup.appendChild(openLink);
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
            // Content area
            const contentArea = document.createElement("div");
            contentArea.className =
                "flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900";
            wrapper.appendChild(contentArea);
            const canvas = document.createElement("canvas");
            canvas.className = "shadow-sm";
            contentArea.appendChild(canvas);
            // Loading indicator
            const loadingDiv = document.createElement("div");
            loadingDiv.className = "flex items-center justify-center p-8";
            loadingDiv.innerHTML =
                '<p class="text-sm text-muted-foreground animate-pulse">PDF \uB85C\uB529 \uC911...</p>';
            contentArea.appendChild(loadingDiv);
            canvas.style.display = "none";
            // Navigation (added later if needed)
            let navDiv = null;
            let currentPage = 1;
            let totalPages = 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let pdfDoc = null;
            let rendering = false;
            async function renderPage() {
                if (!pdfDoc || rendering)
                    return;
                rendering = true;
                try {
                    const pageObj = await pdfDoc.getPage(currentPage);
                    const unscaledViewport = pageObj.getViewport({ scale: 1 });
                    const availableWidth = contentArea.clientWidth - 32;
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
                // Update page counter
                if (navDiv) {
                    const pageSpan = navDiv.querySelector(".page-counter");
                    if (pageSpan)
                        pageSpan.textContent = `${currentPage} / ${totalPages}`;
                }
            }
            // Load PDF
            (async () => {
                try {
                    const pdfjsLib = await getPdfJs();
                    const loadingTask = pdfjsLib.getDocument(node.attrs.src);
                    pdfDoc = await loadingTask.promise;
                    totalPages = pdfDoc.numPages;
                    loadingDiv.style.display = "none";
                    canvas.style.display = "";
                    if (totalPages > 1) {
                        navDiv = document.createElement("div");
                        navDiv.className =
                            "flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-background";
                        const prevBtn = document.createElement("button");
                        prevBtn.type = "button";
                        prevBtn.className =
                            "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30";
                        prevBtn.title = "\uC774\uC804 \uD398\uC774\uC9C0";
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
                        pageSpan.className = "text-sm tabular-nums page-counter";
                        pageSpan.textContent = `1 / ${totalPages}`;
                        navDiv.appendChild(pageSpan);
                        const nextBtn = document.createElement("button");
                        nextBtn.type = "button";
                        nextBtn.className =
                            "p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30";
                        nextBtn.title = "\uB2E4\uC74C \uD398\uC774\uC9C0";
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
                    // ResizeObserver
                    let timeout;
                    const observer = new ResizeObserver(() => {
                        clearTimeout(timeout);
                        timeout = setTimeout(renderPage, 100);
                    });
                    observer.observe(contentArea);
                }
                catch (e) {
                    console.error("[PdfBlockView] PDF \uB85C\uB4DC \uC2E4\uD328:", node.attrs.src, e);
                    loadingDiv.innerHTML =
                        '<p class="text-sm text-muted-foreground">PDF\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</p>';
                }
            })();
            return {
                dom,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== "pdfBlock")
                        return false;
                    return true;
                },
                selectNode: () => {
                    wrapper.style.borderColor = "var(--primary)";
                    wrapper.style.boxShadow =
                        "0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent)";
                },
                deselectNode: () => {
                    wrapper.style.borderColor = "var(--border)";
                    wrapper.style.boxShadow = "none";
                },
            };
        };
    },
});
