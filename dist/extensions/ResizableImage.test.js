import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage, normalizeImageWidth } from "./ResizableImage";
import { sanitizeHtml } from "../utils/sanitize";
let editor = null;
const make = (content) => {
    editor = new Editor({
        element: document.createElement("div"),
        extensions: [StarterKit, ResizableImage.configure({ inline: false })],
        content
    });
    return editor;
};
const imageAttrs = (e) => {
    const node = e.getJSON().content?.find((n) => n.type === "image");
    return node?.attrs ?? null;
};
afterEach(() => {
    editor?.destroy();
    editor = null;
});
describe("normalizeImageWidth", () => {
    it("숫자·px·공백을 단위 없는 정수로 만든다", () => {
        expect(normalizeImageWidth("480")).toBe(480);
        expect(normalizeImageWidth("480px")).toBe(480);
        expect(normalizeImageWidth(" 480px ")).toBe(480);
        expect(normalizeImageWidth(480.4)).toBe(480);
    });
    it("px 로 환산할 수 없는 값은 버린다", () => {
        // 컨테이너 폭을 모르는 시점이라 `%` 를 px 로 바꿀 수 없다.
        // 억지로 숫자만 뽑으면 `50%` 가 `50px` 이 되어 이미지가 손톱만 해진다.
        expect(normalizeImageWidth("50%")).toBeNull();
        expect(normalizeImageWidth("20em")).toBeNull();
        expect(normalizeImageWidth("auto")).toBeNull();
        expect(normalizeImageWidth("")).toBeNull();
        expect(normalizeImageWidth(null)).toBeNull();
        expect(normalizeImageWidth(0)).toBeNull();
    });
});
describe("ResizableImage", () => {
    it("노드 이름은 그대로 image 다 (저장본이 전부 image 노드다)", () => {
        const e = make("<p></p>");
        expect(e.extensionManager.extensions.find((x) => x.name === "image")).toBeDefined();
    });
    /*
     * 가장 중요한 케이스. **열었다 저장하는 것만으로 크기가 박히면 안 된다** —
     * 손대지 않은 이미지가 그 시점의 렌더 폭에 고정되면 반응형이 죽는다.
     */
    it("width 없는 img 는 왕복해도 width 속성이 생기지 않는다", () => {
        const e = make('<img src="https://example.com/a.png">');
        expect(imageAttrs(e)?.width).toBeNull();
        const html = e.getHTML();
        expect(html).toContain('src="https://example.com/a.png"');
        expect(html).not.toContain("width=");
    });
    it('width="480" 을 480 으로 읽는다', () => {
        const e = make('<img src="https://example.com/a.png" width="480">');
        expect(imageAttrs(e)?.width).toBe(480);
    });
    it('width="480px" 도 480 으로 정규화한다', () => {
        const e = make('<img src="https://example.com/a.png" width="480px">');
        expect(imageAttrs(e)?.width).toBe(480);
    });
    it('style="width:480px" 만 있는 옛 문서도 480 으로 읽는다', () => {
        const e = make('<img src="https://example.com/a.png" style="width: 480px">');
        expect(imageAttrs(e)?.width).toBe(480);
    });
    it("퍼센트 폭은 px 로 바꾸지 않고 무시한다", () => {
        const e = make('<img src="https://example.com/a.png" style="width: 50%">');
        expect(imageAttrs(e)?.width).toBeNull();
        expect(e.getHTML()).not.toContain("width=");
    });
    /*
     * 저장 형식이 `style` 이면 안 된다 — 정올이 저장 HTML 을 `{@html}` 로 그릴 때
     * 태우는 `sanitizeHtml` 의 img 허용 목록에 `style` 이 없어서 조용히 지워진다.
     * 그러면 정적 렌더는 원래 크기, 에디터는 조절한 크기로 화면이 튄다.
     */
    it("저장은 언제나 단위 없는 width 속성 한 가지다", () => {
        const e = make('<img src="https://example.com/a.png" style="width: 480px">');
        const html = e.getHTML();
        expect(html).toContain('width="480"');
        expect(html).not.toContain("480px");
        expect(html).not.toContain("style=");
    });
    it("저장한 폭이 살균을 통과해도 살아남는다", () => {
        const e = make('<img src="https://example.com/a.png" width="480">');
        expect(sanitizeHtml(e.getHTML())).toContain('width="480"');
    });
});
