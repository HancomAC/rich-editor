import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHydrator } from "tiptap-static/hydrate";
import { createBuiltinStaticNodes } from "./builtin-nodes";
const pdfFixture = vi.hoisted(() => ({ sources: [], pages: [] }));
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
                            render: () => ({ promise: Promise.resolve() }),
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
});
