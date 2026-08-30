import { describe, expect, it } from "vitest";
import { createStaticRenderer } from "tiptap-static";
import { FileAttachment } from "../extensions/FileAttachment";
import { createStaticSanitizePolicy } from "./policy";
describe("rich editor static rendering", () => {
    it("mounts an existing NodeView without creating a Tiptap Editor", () => {
        const target = document.createElement("div");
        const renderer = createStaticRenderer({
            extensions: [FileAttachment],
            rawNodeViews: true,
            sanitize: createStaticSanitizePolicy(),
        });
        const session = renderer.mount(target, '<div data-file-src="/files/report.pdf" data-file-name="report.pdf" data-file-size="2048"></div>');
        const link = target.querySelector("a");
        expect(link?.textContent).toBe("report.pdf");
        expect(link?.getAttribute("href")).toBe("/files/report.pdf");
        expect(target.textContent).toContain("2.0 KB");
        expect(target.querySelector(".ProseMirror")).toBeNull();
        session.destroy();
        expect(target.querySelector('[data-file-name="report.pdf"]')).not.toBeNull();
    });
});
