import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHydrator } from "tiptap-static/hydrate";
import { createBuiltinStaticNodes } from "./builtin-nodes";
const pdfFixture = vi.hoisted(() => ({
    sources: [],
    pages: [],
    render: vi.fn(() => ({ promise: Promise.resolve() })),
}));
vi.mock("../utils/pdf", () => ({
    getPdfJs: async () => ({
        getDocument: (source) => {
            pdfFixture.sources.push(source);
            return {
                promise: Promise.resolve({
                    numPages: 2,
                    getPage: async (page) => {
                        pdfFixture.pages.push(page);
                        return {
                            getViewport: ({ scale }) => ({
                                width: 600 * scale,
                                height: 800 * scale,
                            }),
                            render: pdfFixture.render,
                        };
                    },
                }),
            };
        },
    }),
}));
describe("rich editor static rendering", () => {
    beforeEach(() => {
        pdfFixture.sources.length = 0;
        pdfFixture.pages.length = 0;
        pdfFixture.render.mockReset();
        pdfFixture.render.mockImplementation(() => ({ promise: Promise.resolve() }));
    });
    it("mounts an existing NodeView without creating a Tiptap Editor", () => {
        const target = document.createElement("div");
        const renderer = createHydrator({ nodes: createBuiltinStaticNodes() });
        const session = renderer.mount(target, '<div data-file-src="/files/report.pdf" data-file-name="report.pdf" data-file-size="2048"></div>');
        const link = target.querySelector("a");
        expect(link?.textContent).toBe("report.pdf");
        expect(link?.getAttribute("href")).toBe("/files/report.pdf");
        expect(target.textContent).toContain("2.0 KB");
        expect(target.querySelector(".ProseMirror")).toBeNull();
        session.destroy();
        expect(target.querySelector('[data-file-name="report.pdf"]')).not.toBeNull();
    });
    it("uses configured file resolution without loading an editor extension", async () => {
        const target = document.createElement("div");
        const renderer = createHydrator({
            nodes: createBuiltinStaticNodes({
                resolver: async () => ({ src: "/resolved/source.cpp", name: "source.cpp", size: 1024 }),
                downloadBaseUrl: "/downloads",
            }),
        });
        renderer.mount(target, '<div data-file-id="abc" data-file-name="pending"></div>');
        await Promise.resolve();
        await Promise.resolve();
        const link = target.querySelector("a");
        expect(link?.textContent).toBe("source.cpp");
        expect(link?.getAttribute("href")).toBe("/downloads/abc/download");
        expect(target.textContent).toContain("1.0 KB");
    });
    it("hydrates card content into the prepared content hole", () => {
        const target = document.createElement("div");
        const renderer = createHydrator({ nodes: createBuiltinStaticNodes() });
        renderer.mount(target, '<div data-type="card" data-card-title="Notice"><p>body</p></div>');
        expect(target.querySelector(".hce-card-title")?.textContent).toBe("Notice");
        expect(target.querySelector(".hce-card-body p")?.textContent).toBe("body");
        expect(renderer.diagnostics).toEqual([]);
    });
    it("renders PDFs through PDF.js and supports page navigation", async () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            setTransform: vi.fn(),
            clearRect: vi.fn(),
        });
        const target = document.createElement("div");
        const renderer = createHydrator({ nodes: createBuiltinStaticNodes() });
        renderer.mount(target, '<div data-pdf-id="document-1" data-pdf-name="report.pdf"></div>');
        await vi.waitFor(() => {
            expect(target.querySelector(".hce-static-pdf-page")?.textContent).toBe("1 / 2");
            expect(pdfFixture.pages).toContain(1);
        });
        expect(pdfFixture.sources).toEqual(["/api/upload/document-1/download"]);
        expect(target.querySelector("embed")).toBeNull();
        expect(target.querySelector("canvas")?.hidden).toBe(false);
        const buttons = target.querySelectorAll("button");
        buttons[1]?.click();
        await vi.waitFor(() => {
            expect(target.querySelector(".hce-static-pdf-page")?.textContent).toBe("2 / 2");
            expect(pdfFixture.pages).toContain(2);
        });
    });
    it("blocks button and keyboard navigation until the active PDF render finishes", async () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            setTransform: vi.fn(),
            clearRect: vi.fn(),
        });
        let finishRender;
        const pendingRender = new Promise((resolve) => {
            finishRender = resolve;
        });
        pdfFixture.render.mockReturnValueOnce({ promise: pendingRender });
        const target = document.createElement("div");
        const renderer = createHydrator({ nodes: createBuiltinStaticNodes() });
        const session = renderer.mount(target, '<div data-pdf-id="document-1"></div>');
        await vi.waitFor(() => expect(pdfFixture.render).toHaveBeenCalledTimes(1));
        const buttons = target.querySelectorAll("button");
        const viewer = target.querySelector('[role="group"]');
        expect(buttons[0].disabled).toBe(true);
        expect(buttons[1].disabled).toBe(true);
        buttons[1].click();
        viewer.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        await Promise.resolve();
        expect(pdfFixture.pages).toEqual([1]);
        expect(pdfFixture.render).toHaveBeenCalledTimes(1);
        expect(target.querySelector(".hce-static-pdf-page")?.textContent).toBe("1 / 2");
        finishRender();
        await vi.waitFor(() => expect(buttons[1].disabled).toBe(false));
        buttons[1].click();
        await vi.waitFor(() => {
            expect(pdfFixture.pages).toEqual([1, 2]);
            expect(pdfFixture.render).toHaveBeenCalledTimes(2);
            expect(buttons[0].disabled).toBe(false);
        });
        expect(target.querySelector(".hce-static-pdf-page")?.textContent).toBe("2 / 2");
        session.destroy();
    });
    it("unlocks PDF navigation after a render fails", async () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            setTransform: vi.fn(),
            clearRect: vi.fn(),
        });
        let failRender;
        const pendingRender = new Promise((_resolve, reject) => {
            failRender = reject;
        });
        pdfFixture.render.mockReturnValueOnce({ promise: pendingRender });
        const target = document.createElement("div");
        const renderer = createHydrator({ nodes: createBuiltinStaticNodes() });
        const session = renderer.mount(target, '<div data-pdf-id="document-1"></div>');
        await vi.waitFor(() => expect(pdfFixture.render).toHaveBeenCalledTimes(1));
        failRender(new Error("PDF render failed"));
        const buttons = target.querySelectorAll("button");
        await vi.waitFor(() => {
            expect(buttons[1].disabled).toBe(false);
            expect(target.querySelector(".hce-static-pdf-status")?.textContent).toBe("PDF를 불러올 수 없습니다.");
        });
        target
            .querySelector('[role="group"]')
            .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        await vi.waitFor(() => {
            expect(pdfFixture.pages).toEqual([1, 2]);
            expect(target.querySelector("canvas")?.hidden).toBe(false);
            expect(target.querySelector(".hce-static-pdf-status")?.hidden).toBe(true);
        });
        session.destroy();
    });
});
