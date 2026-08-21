import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { CardBlock } from "./CardBlock";
import { transformLegacyHtml } from "../utils/sanitize";
let editor = null;
const make = (content) => {
    editor = new Editor({
        element: document.createElement("div"),
        extensions: [StarterKit, CardBlock],
        content
    });
    return editor;
};
afterEach(() => {
    editor?.destroy();
    editor = null;
});
describe("CardBlock", () => {
    it("새 스키마(div[data-type=card])를 카드로 읽는다", () => {
        const e = make('<div data-type="card" data-card-title="제목" data-card-background="red" data-card-height="240"><p>본문</p></div>');
        const node = e.getJSON().content?.[0];
        expect(node?.type).toBe("card");
        expect(node?.attrs?.title).toBe("제목");
        expect(node?.attrs?.background).toBe("red");
        expect(node?.attrs?.height).toBe("240");
        expect(node?.content?.[0]?.type).toBe("paragraph");
    });
    it("옛 정올 스키마(<tiptap-card>)도 그대로 읽는다", () => {
        const e = make('<tiptap-card title="옛제목" background="blue" height="300"><p>본문</p></tiptap-card>');
        const node = e.getJSON().content?.[0];
        expect(node?.type).toBe("card");
        expect(node?.attrs?.title).toBe("옛제목");
        expect(node?.attrs?.background).toBe("blue");
        expect(node?.attrs?.height).toBe("300");
    });
    it("내용을 가진 컨테이너다 — 자식 블록이 보존된다", () => {
        const e = make('<div data-type="card"><p>첫째</p><p>둘째</p></div>');
        const node = e.getJSON().content?.[0];
        expect(node?.content).toHaveLength(2);
    });
    it("새 스키마로 다시 쓴다", () => {
        const e = make('<tiptap-card title="T" height="200"><p>x</p></tiptap-card>');
        const html = e.getHTML();
        expect(html).toContain('data-type="card"');
        expect(html).toContain('data-card-title="T"');
        expect(html).toContain('data-card-height="200"');
        // 옛 태그로는 저장하지 않는다
        expect(html).not.toContain("<tiptap-card");
    });
    it("height 기본값은 190", () => {
        const e = make('<div data-type="card"><p>x</p></div>');
        expect(e.getJSON().content?.[0]?.attrs?.height).toBe("190");
    });
    it("setCard 명령이 빈 문단 하나를 가진 카드를 넣는다", () => {
        const e = make("<p></p>");
        e.commands.setCard();
        const card = e.getJSON().content?.find((n) => n.type === "card");
        expect(card).toBeTruthy();
        expect(card?.content?.[0]?.type).toBe("paragraph");
    });
});
describe("transformLegacyHtml — tiptap-card", () => {
    it("속성 순서와 무관하게 바꾼다", () => {
        const a = transformLegacyHtml('<tiptap-card title="T" background="B" height="200"><p>x</p></tiptap-card>');
        const b = transformLegacyHtml('<tiptap-card height="200" background="B" title="T"><p>x</p></tiptap-card>');
        for (const out of [a, b]) {
            expect(out).toContain('data-type="card"');
            expect(out).toContain('data-card-title="T"');
            expect(out).toContain('data-card-background="B"');
            expect(out).toContain('data-card-height="200"');
            expect(out).toContain("<p>x</p>");
        }
    });
    it("속성이 없어도 기본 높이를 붙인다", () => {
        const out = transformLegacyHtml("<tiptap-card><p>x</p></tiptap-card>");
        expect(out).toContain('data-card-height="190"');
        expect(out).not.toContain("data-card-title");
    });
    it("중첩 블록이 있는 본문을 통째로 보존한다", () => {
        const out = transformLegacyHtml('<tiptap-card title="T"><p>하나</p><ul><li>둘</li></ul></tiptap-card>');
        expect(out).toContain("<ul><li>둘</li></ul>");
    });
    it("카드가 둘 이상이어도 각각 바꾼다", () => {
        const out = transformLegacyHtml('<tiptap-card title="A"><p>1</p></tiptap-card><tiptap-card title="B"><p>2</p></tiptap-card>');
        expect(out.match(/data-type="card"/g)).toHaveLength(2);
        expect(out).toContain('data-card-title="A"');
        expect(out).toContain('data-card-title="B"');
    });
});
