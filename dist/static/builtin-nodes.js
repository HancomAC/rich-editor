import { defineStaticNode } from "tiptap-static/hydrate";
import { createStaticNodeViewHook } from "tiptap-static/protocol";
import { getPdfJs } from "../utils/pdf";
function attributes(element) {
    return Object.fromEntries([...element.attributes].map(({ name, value }) => [name, value]));
}
function numberAttribute(value) {
    if (value === null)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function getFileIcon(name) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const icons = {
        pdf: "📄",
        doc: "📝",
        docx: "📝",
        xls: "📊",
        xlsx: "📊",
        ppt: "📊",
        pptx: "📊",
        zip: "📦",
        rar: "📦",
        "7z": "📦",
        txt: "📃",
        csv: "📃",
        hwp: "📄",
        hwpx: "📄",
    };
    return icons[ext] ?? "📎";
}
function fileView({ node, extension }) {
    const dom = document.createElement("div");
    dom.className = "hce-static-file";
    dom.setAttribute("data-node-view-wrapper", "");
    const icon = document.createElement("span");
    icon.className = "hce-static-file-icon";
    icon.setAttribute("aria-hidden", "true");
    const link = document.createElement("a");
    link.className = "hce-static-file-name";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const size = document.createElement("span");
    size.className = "hce-static-file-size";
    let active = true;
    let name = String(node.attrs.name || "파일");
    const fileId = node.attrs.fileId ? String(node.attrs.fileId) : "";
    const directSrc = node.attrs.src ? String(node.attrs.src) : "";
    const baseUrl = String(extension.options?.downloadBaseUrl || "/api/upload").replace(/\/$/, "");
    const proxySrc = fileId ? `${baseUrl}/${encodeURIComponent(fileId)}/download` : "";
    const paint = (src = directSrc, nextName = name, bytes = node.attrs.size) => {
        name = nextName;
        icon.textContent = getFileIcon(name);
        link.textContent = name;
        if (src || proxySrc) {
            link.href = proxySrc || src;
            link.download = name;
        }
        size.textContent = typeof bytes === "number" && bytes > 0 ? formatFileSize(bytes) : "";
    };
    paint();
    const resolver = extension.options?.resolver;
    if (!directSrc && fileId && resolver) {
        size.textContent = "loading...";
        void resolver(fileId)
            .then((result) => {
            if (!active)
                return;
            paint(result.src, result.name || name, result.size);
        })
            .catch(() => {
            if (active)
                size.textContent = "";
        });
    }
    dom.append(icon, link, size);
    return { dom, destroy: () => { active = false; } };
}
function mediaView({ node }) {
    const dom = document.createElement("div");
    dom.className = "hce-static-media";
    dom.setAttribute("data-node-view-wrapper", "");
    if (node.attrs.width)
        dom.style.width = String(node.attrs.width);
    const frame = document.createElement("div");
    frame.className = "hce-static-media-frame";
    const src = String(node.attrs.src || "");
    if (src) {
        const iframe = document.createElement("iframe");
        iframe.src = src;
        iframe.title = "Embedded video";
        iframe.loading = "lazy";
        iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("credentialless", "");
        frame.append(iframe);
    }
    dom.append(frame);
    return { dom };
}
const DEFAULT_CARD_BACKGROUND = "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 55%, #fef3c7 100%)";
function cardView({ node }) {
    const dom = document.createElement("div");
    dom.className = "hce-card";
    dom.setAttribute("data-node-view-wrapper", "");
    const frame = document.createElement("section");
    frame.className = "hce-card-frame";
    const parsedHeight = Number.parseFloat(String(node.attrs.height ?? ""));
    const height = Number.isFinite(parsedHeight)
        ? Math.min(640, Math.max(120, Math.round(parsedHeight)))
        : 190;
    frame.style.height = `${height}px`;
    frame.style.background =
        String(node.attrs.background || "").trim().replace(/;/g, "") || DEFAULT_CARD_BACKGROUND;
    const content = document.createElement("div");
    content.className = "hce-card-content";
    const title = String(node.attrs.title || "");
    if (title) {
        const heading = document.createElement("h2");
        heading.className = "hce-card-title";
        heading.textContent = title;
        content.append(heading);
    }
    const body = document.createElement("div");
    body.className = "hce-card-body";
    content.append(body);
    frame.append(content);
    dom.append(frame);
    return { dom, contentDOM: body };
}
function pdfView({ node, extension }) {
    const dom = document.createElement("div");
    dom.className = "hce-static-pdf";
    dom.setAttribute("data-node-view-wrapper", "");
    dom.tabIndex = 0;
    dom.setAttribute("role", "group");
    dom.setAttribute("aria-label", "PDF 문서 — 좌우 방향키로 쪽 넘김");
    if (node.attrs.width)
        dom.style.width = String(node.attrs.width);
    const toolbar = document.createElement("div");
    toolbar.className = "hce-static-pdf-toolbar";
    const link = document.createElement("a");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `📄 ${String(node.attrs.label || node.attrs.name || "PDF")}`;
    const fileId = node.attrs.fileId ? String(node.attrs.fileId) : "";
    const directSrc = node.attrs.src ? String(node.attrs.src) : "";
    const baseUrl = String(extension.options?.downloadBaseUrl || "/api/upload").replace(/\/$/, "");
    const proxySrc = fileId ? `${baseUrl}/${encodeURIComponent(fileId)}/download` : "";
    if (proxySrc || directSrc)
        link.href = proxySrc || directSrc;
    const previewSrc = proxySrc || directSrc;
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "이전 쪽";
    previous.disabled = true;
    const pageStatus = document.createElement("span");
    pageStatus.className = "hce-static-pdf-page";
    pageStatus.textContent = "1 / 1";
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "다음 쪽";
    next.disabled = true;
    toolbar.append(link, previous, pageStatus, next);
    const frame = document.createElement("div");
    frame.className = "hce-static-pdf-frame";
    const status = document.createElement("p");
    status.className = "hce-static-pdf-status";
    status.textContent = previewSrc ? "PDF를 불러오는 중입니다." : "PDF 주소가 없습니다.";
    const canvas = document.createElement("canvas");
    canvas.hidden = true;
    frame.append(status, canvas);
    dom.append(toolbar, frame);
    let destroyed = false;
    let documentProxy = null;
    let currentPage = 1;
    let renderSequence = 0;
    const syncPageControls = () => {
        const total = documentProxy?.numPages ?? 1;
        pageStatus.textContent = `${currentPage} / ${total}`;
        previous.disabled = !documentProxy || currentPage <= 1;
        next.disabled = !documentProxy || currentPage >= total;
    };
    const showError = (message) => {
        if (destroyed)
            return;
        status.hidden = false;
        status.textContent = message;
    };
    const renderPage = async () => {
        if (!documentProxy || destroyed)
            return;
        const sequence = ++renderSequence;
        const page = await documentProxy.getPage(currentPage);
        if (destroyed || sequence !== renderSequence)
            return;
        const initialViewport = page.getViewport({ scale: 1 });
        const availableWidth = frame.clientWidth || dom.clientWidth || initialViewport.width;
        const scale = Math.min(1, availableWidth / initialViewport.width);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context)
            throw new Error("Canvas 2D context is unavailable.");
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        if (destroyed || sequence !== renderSequence)
            return;
        canvas.hidden = false;
        status.hidden = true;
    };
    const goToPage = (offset) => {
        if (!documentProxy)
            return;
        const target = Math.min(documentProxy.numPages, Math.max(1, currentPage + offset));
        if (target === currentPage)
            return;
        currentPage = target;
        syncPageControls();
        void renderPage().catch(() => showError("PDF 쪽을 표시할 수 없습니다."));
    };
    previous.addEventListener("click", () => goToPage(-1));
    next.addEventListener("click", () => goToPage(1));
    dom.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
            return;
        event.preventDefault();
        goToPage(event.key === "ArrowLeft" ? -1 : 1);
    });
    if (previewSrc) {
        void getPdfJs()
            .then((pdfJs) => pdfJs.getDocument(previewSrc).promise)
            .then(async (loadedDocument) => {
            if (destroyed) {
                await loadedDocument.destroy?.();
                return;
            }
            documentProxy = loadedDocument;
            syncPageControls();
            await renderPage();
        })
            .catch(() => showError("PDF를 불러올 수 없습니다."));
    }
    return {
        dom,
        destroy() {
            destroyed = true;
            renderSequence += 1;
            void documentProxy?.destroy?.();
        },
    };
}
function mathView({ node }) {
    const displayMode = node.type.name === "math_display";
    const dom = document.createElement(displayMode ? "div" : "span");
    dom.className = `math-node math-node-view ${displayMode ? "math-display" : "math-inline"}`;
    dom.setAttribute("data-node-view-wrapper", "");
    const rendered = document.createElement("span");
    rendered.className = "math-render";
    rendered.setAttribute("aria-hidden", "true");
    const source = document.createElement("span");
    source.className = "math-source";
    dom.append(rendered, source);
    let active = true;
    void import("katex")
        .then(({ default: katex }) => {
        if (!active)
            return;
        rendered.innerHTML = katex.renderToString(node.textContent, {
            displayMode,
            output: "htmlAndMathml",
            strict: false,
            throwOnError: false,
            trust: false,
        });
    })
        .catch(() => {
        if (active)
            rendered.textContent = node.textContent;
    });
    return { dom, contentDOM: source, destroy: () => { active = false; } };
}
function parseFile(element) {
    return {
        attrs: {
            fileId: element.getAttribute("data-file-id") || element.getAttribute("id"),
            src: element.getAttribute("data-file-src"),
            name: element.getAttribute("data-file-name") || element.textContent?.trim() || "파일",
            size: numberAttribute(element.getAttribute("data-file-size")),
        },
        HTMLAttributes: attributes(element),
    };
}
function parsePdf(element) {
    const src = element.getAttribute("data-pdf-src") || element.getAttribute("src");
    return {
        attrs: {
            fileId: element.getAttribute("data-pdf-id"),
            src,
            name: element.getAttribute("data-pdf-name") ||
                src?.split("/").pop()?.replace(/[?#].*$/, "") ||
                "PDF",
            width: element.getAttribute("data-pdf-width") || element.style.width || null,
            label: element.getAttribute("data-pdf-label"),
        },
        HTMLAttributes: attributes(element),
    };
}
export function createBuiltinStaticNodes(options = {}) {
    const fileOptions = {
        resolver: options.resolver ?? null,
        downloadBaseUrl: options.downloadBaseUrl ?? "/api/upload",
    };
    return [
        defineStaticNode({
            name: "pdfBlock",
            rules: [
                { selector: "div[data-pdf-id]", parse: parsePdf },
                { selector: "div[data-pdf-src]", parse: parsePdf },
                { selector: 'embed[type="application/pdf"]', parse: parsePdf },
            ],
            type: { isLeaf: true, isAtom: true },
            options: fileOptions,
            nodeView: createStaticNodeViewHook(pdfView),
        }),
        defineStaticNode({
            name: "fileAttachment",
            rules: [
                { selector: "div[data-file-id]", parse: parseFile },
                { selector: "div[data-file-src]", parse: parseFile },
                { selector: "tiptap-file", parse: parseFile },
            ],
            type: { isLeaf: true, isAtom: true },
            options: fileOptions,
            nodeView: createStaticNodeViewHook(fileView),
        }),
        defineStaticNode({
            name: "mbusVideo",
            rules: [{
                    selector: "div[data-mbus-src]",
                    parse: (element) => ({
                        attrs: {
                            src: element.getAttribute("data-mbus-src"),
                            width: element.getAttribute("data-mbus-width") || element.style.width || null,
                        },
                        HTMLAttributes: attributes(element),
                    }),
                }],
            type: { isLeaf: true, isAtom: true },
            nodeView: createStaticNodeViewHook(mediaView),
        }),
        defineStaticNode({
            name: "videoEmbed",
            rules: [{
                    selector: "div[data-video-src]",
                    parse: (element) => ({
                        attrs: {
                            src: element.getAttribute("data-video-src"),
                            width: element.getAttribute("data-video-width") || element.style.width || null,
                        },
                        HTMLAttributes: attributes(element),
                    }),
                }],
            type: { isLeaf: true, isAtom: true },
            nodeView: createStaticNodeViewHook(mediaView),
        }),
        defineStaticNode({
            name: "card",
            rules: [
                {
                    selector: 'div[data-type="card"]',
                    parse: (element) => ({
                        attrs: {
                            title: element.getAttribute("data-card-title") || "",
                            background: element.getAttribute("data-card-background") || "",
                            height: element.getAttribute("data-card-height") || "190",
                        },
                        HTMLAttributes: attributes(element),
                    }),
                },
                {
                    selector: "tiptap-card",
                    parse: (element) => ({
                        attrs: {
                            title: element.getAttribute("title") || "",
                            background: element.getAttribute("background") || "",
                            height: element.getAttribute("height") || "190",
                        },
                        HTMLAttributes: attributes(element),
                    }),
                },
            ],
            type: { isLeaf: false, spec: { content: "block*" } },
            nodeView: createStaticNodeViewHook(cardView),
        }),
        defineStaticNode({
            name: "math_inline",
            rules: [{ selector: "math-inline" }],
            type: { isLeaf: false, isInline: true, isAtom: true, spec: { content: "text*" } },
            nodeView: createStaticNodeViewHook(mathView),
        }),
        defineStaticNode({
            name: "math_display",
            rules: [{ selector: "math-display" }],
            type: { isLeaf: false, isAtom: true, spec: { content: "text*" } },
            nodeView: createStaticNodeViewHook(mathView),
        }),
    ];
}
export const builtinStaticNodes = createBuiltinStaticNodes();
