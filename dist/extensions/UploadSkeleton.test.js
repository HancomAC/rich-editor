import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import { UploadSkeleton, insertUploadSkeleton, UPLOAD_SKELETON_NODE } from "./UploadSkeleton";
import { ResizableImage } from "./ResizableImage";
import { sanitizeHtml, stripUploadSkeletonHtml, transformLegacyHtml } from "../utils/sanitize";
/*
 * 스켈레톤의 계약은 세 가지다 — 서고(insert), 그 자리가 실제 노드로 바뀌고(replaceWith),
 * 실패하면 흔적 없이 사라진다(remove). 그리고 무슨 일이 있어도 **저장 HTML 에 남지
 * 않는다.** 여기서는 그 네 가지를 전부 문서 상태로 확인한다.
 */
describe("UploadSkeleton", () => {
    let editor;
    function createEditor(content = "<p></p>") {
        editor = new Editor({
            element: document.createElement("div"),
            extensions: [StarterKit, UploadSkeleton, ResizableImage.configure({ inline: false })],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    function findNode(typeName) {
        let found = null;
        editor.state.doc.descendants((node, pos) => {
            if (found)
                return false;
            if (node.type.name === typeName)
                found = { pos, node };
            return found === null;
        });
        return found;
    }
    it("삽입 — 타입별 높이의 스켈레톤이 서고 뒤에 빈 문단이 온다", () => {
        createEditor("<p>본문</p>");
        const handle = insertUploadSkeleton(editor, { kind: "image" });
        expect(handle).not.toBeNull();
        expect(handle.exists()).toBe(true);
        const found = findNode(UPLOAD_SKELETON_NODE);
        expect(found).not.toBeNull();
        expect(found.node.attrs.kind).toBe("image");
        expect(found.node.attrs.height).toBe(220);
        expect(found.node.attrs.uploadId).toBe(handle.id);
        // 커서가 이어서 쓸 빈 문단이 바로 뒤에 있어야 한다
        const after = editor.state.doc.nodeAt(found.pos + found.node.nodeSize);
        expect(after?.type.name).toBe("paragraph");
        // 스켈레톤이 선택되어 있어야 한다 — 업로드 흐름이 여기서 이어진다
        expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    });
    it("높이는 44–1200 으로 죈다", () => {
        createEditor();
        insertUploadSkeleton(editor, { kind: "block", height: 5000 });
        expect(findNode(UPLOAD_SKELETON_NODE).node.attrs.height).toBe(1200);
        editor.commands.clearContent();
        insertUploadSkeleton(editor, { kind: "file", height: 1 });
        expect(findNode(UPLOAD_SKELETON_NODE).node.attrs.height).toBe(44);
    });
    it("replaceWith — 그 자리가 실제 노드로 바뀐다", () => {
        createEditor("<p>본문</p>");
        const handle = insertUploadSkeleton(editor, { kind: "image" });
        expect(handle.replaceWith({ type: "image", attrs: { src: "/a.png" } })).toBe(true);
        expect(findNode(UPLOAD_SKELETON_NODE)).toBeNull();
        expect(handle.exists()).toBe(false);
        const image = findNode("image");
        expect(image).not.toBeNull();
        expect(image.node.attrs.src).toBe("/a.png");
    });
    it("위쪽을 편집해 자리가 밀려도 id 로 찾아 바꾼다", () => {
        createEditor("<p>본문</p>");
        const handle = insertUploadSkeleton(editor, { kind: "image", at: editor.state.doc.content.size });
        // 업로드가 도는 사이 문서 맨 앞에 글이 들어온다 — 위치가 전부 밀린다
        editor.commands.insertContentAt(1, "새로 쓴 글");
        expect(handle.replaceWith({ type: "image", attrs: { src: "/b.png" } })).toBe(true);
        expect(findNode("image").node.attrs.src).toBe("/b.png");
        expect(findNode(UPLOAD_SKELETON_NODE)).toBeNull();
    });
    it("remove — 함께 심은 빈 문단까지 걷어 원래 문서로 돌아간다", () => {
        createEditor("<p>본문</p>");
        const before = editor.getHTML();
        const handle = insertUploadSkeleton(editor, { kind: "pdf" });
        expect(handle.remove()).toBe(true);
        expect(editor.getHTML()).toBe(before);
    });
    it("사용자가 스켈레톤을 지웠으면 조용히 실패한다", () => {
        createEditor("<p>본문</p>");
        const handle = insertUploadSkeleton(editor, { kind: "file" });
        editor.commands.clearContent();
        expect(handle.exists()).toBe(false);
        expect(handle.replaceWith({ type: "image", attrs: { src: "/c.png" } })).toBe(false);
        expect(handle.remove()).toBe(false);
    });
    it("스키마에 노드가 없으면 null — 호출부가 다른 진행 표시로 물러날 신호", () => {
        const bare = new Editor({
            element: document.createElement("div"),
            extensions: [StarterKit],
            content: "<p></p>"
        });
        expect(insertUploadSkeleton(bare)).toBeNull();
        bare.destroy();
    });
    /*
     * 영속 금지 — 스켈레톤이 서 있는 채로 저장이 돌더라도, 내보내기(`strip…`)·읽기
     * (`transformLegacyHtml`)·정적 렌더(`sanitizeHtml`) 어느 길로도 살아남지 못한다.
     */
    it("직렬화엔 나오지만 세 관문이 전부 걷어낸다", () => {
        createEditor("<p>본문</p>");
        insertUploadSkeleton(editor, { kind: "image" });
        const html = editor.getHTML();
        expect(html).toContain("<tiptap-upload-skeleton");
        for (const cleaned of [
            stripUploadSkeletonHtml(html),
            transformLegacyHtml(html),
            sanitizeHtml(html)
        ]) {
            expect(cleaned).not.toContain("tiptap-upload-skeleton");
            expect(cleaned).toContain("본문");
        }
    });
    it("stripUploadSkeletonHtml 은 닫는 태그 유무를 가리지 않고, 없으면 원본 그대로", () => {
        expect(stripUploadSkeletonHtml('<tiptap-upload-skeleton data-upload-id="x"></tiptap-upload-skeleton><p>a</p>')).toBe("<p>a</p>");
        expect(stripUploadSkeletonHtml('<tiptap-upload-skeleton data-upload-id="x"><p>a</p>')).toBe("<p>a</p>");
        const clean = "<p>스켈레톤 없음</p>";
        expect(stripUploadSkeletonHtml(clean)).toBe(clean);
    });
});
