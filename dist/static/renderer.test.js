import { describe, expect, it } from "vitest";
import { createHydrator } from "tiptap-static/hydrate";
import { createBuiltinStaticNodes } from "./builtin-nodes";
describe("rich editor static rendering", () => {
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
});
