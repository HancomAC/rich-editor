import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MediaResizeToolbar, applyMediaToolbarAction } from "./MediaToolbar";
import { VideoEmbed } from "./VideoEmbed";
import { MbusVideo } from "./MbusVideo";
import { ResizableImage } from "./ResizableImage";
import { TiptapMidibus } from "./TiptapMidibus";
import { sanitizeHtml } from "../utils/sanitize";
import { normalizeMediaAlign, normalizeMediaHeight, normalizeMediaRatio, mediaRatioCss } from "../utils/media-size";
/* ─────────────────────────── 정규화 — 파싱은 관대, 쓰기는 좁게 ─────────────────────────── */
describe("media-size 정규화", () => {
    it("높이 — px 정수만 남는다", () => {
        expect(normalizeMediaHeight("420")).toBe(420);
        expect(normalizeMediaHeight("420px")).toBe(420);
        expect(normalizeMediaHeight(419.6)).toBe(420);
        expect(normalizeMediaHeight("50%")).toBeNull();
        expect(normalizeMediaHeight("auto")).toBeNull();
        expect(normalizeMediaHeight(0)).toBeNull();
    });
    it("비율 — 어떤 꼴이든 `W:H` 정준형으로", () => {
        expect(normalizeMediaRatio("16:9")).toBe("16:9");
        expect(normalizeMediaRatio("16/9")).toBe("16:9");
        expect(normalizeMediaRatio(" 4 : 3 ")).toBe("4:3");
        expect(normalizeMediaRatio("1.78")).toBe("1.78:1");
        expect(normalizeMediaRatio("0:9")).toBeNull();
        expect(normalizeMediaRatio("가로세로")).toBeNull();
    });
    it("비율 → CSS aspect-ratio 값", () => {
        expect(mediaRatioCss("4:3")).toBe("4 / 3");
        expect(mediaRatioCss(null)).toBeNull();
    });
    it("정렬 — 세 값만, 대소문자·여백은 눈감는다", () => {
        expect(normalizeMediaAlign(" CENTER ")).toBe("center");
        expect(normalizeMediaAlign("left")).toBe("left");
        expect(normalizeMediaAlign("middle")).toBeNull();
    });
});
/* ─────────────────────────── 칩 한 번 = 속성 변경 한 벌 ─────────────────────────── */
describe("applyMediaToolbarAction", () => {
    const full = { ratio: true, align: true, widthPresets: true };
    it("비율 선택은 고정 높이를 함께 푼다 — 높이가 남으면 비율이 안 먹는다", () => {
        expect(applyMediaToolbarAction({ height: "400" }, "ratio", "4:3", full)).toEqual({
            ratio: "4:3",
            height: null
        });
    });
    it("켜진 칩을 다시 누르면 해제된다", () => {
        expect(applyMediaToolbarAction({ ratio: "16:9" }, "ratio", "16:9", full)).toEqual({
            ratio: null,
            height: null
        });
        expect(applyMediaToolbarAction({ align: "center" }, "align", "center", full)).toEqual({
            align: null
        });
        expect(applyMediaToolbarAction({ width: "50%" }, "width", "50%", full)).toEqual({
            width: null
        });
    });
    it("정렬·폭은 저장값이 좁다 — 모르는 값은 거절", () => {
        expect(applyMediaToolbarAction({}, "align", "middle", full)).toBeNull();
        expect(applyMediaToolbarAction({}, "width", "30%", full)).toBeNull();
    });
    it("구성에 없는 칩은 아무것도 하지 않는다 — 이미지에 폭 프리셋이 없는 이유", () => {
        expect(applyMediaToolbarAction({}, "ratio", "16:9", { align: true })).toBeNull();
        expect(applyMediaToolbarAction({}, "width", "50%", { align: true })).toBeNull();
    });
});
/* ─────────────────────────── 속성 왕복 — renderHTML/parseHTML ─────────────────────────── */
describe("크기·정렬 속성 왕복", () => {
    let editor;
    function createEditor(extensions, content) {
        editor = new Editor({
            element: document.createElement("div"),
            extensions: [StarterKit, ...extensions],
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
    it("VideoEmbed — 높이·정렬이 data-* 로 돌아온다", () => {
        createEditor([VideoEmbed], '<div data-video-src="https://www.youtube.com/embed/abc" data-video-width="480px" data-video-height="360" data-video-align="center"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-video-height="360"');
        expect(html).toContain('data-video-align="center"');
        // style 은 거울일 뿐이지만 정렬이 정적 렌더에서도 서게 한다
        expect(html).toContain("margin-left: auto");
    });
    it("VideoEmbed — 비율은 높이가 없을 때만 나간다(배타)", () => {
        createEditor([VideoEmbed], '<div data-video-src="https://www.youtube.com/embed/abc" data-video-ratio="16:9"></div>');
        expect(editor.getHTML()).toContain('data-video-ratio="16:9"');
        editor.commands.setContent('<div data-video-src="https://www.youtube.com/embed/abc" data-video-height="360" data-video-ratio="16:9"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-video-height="360"');
        expect(html).not.toContain("data-video-ratio");
    });
    it("MbusVideo — 같은 규칙, 이름만 data-mbus-*", () => {
        createEditor([MbusVideo], '<div data-mbus-src="https://play.mbus.tv/v1/hls/x" data-mbus-height="500" data-mbus-align="right"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-mbus-height="500"');
        expect(html).toContain('data-mbus-align="right"');
    });
    it("이미지 — 정렬은 style 이 아니라 data-align 속성으로", () => {
        createEditor([ResizableImage.configure({ inline: false })], '<img src="/a.png" width="480" data-align="center">');
        expect(editor.getHTML()).toContain('data-align="center"');
    });
    it("이미지 — 모르는 정렬 값은 버린다", () => {
        createEditor([ResizableImage.configure({ inline: false })], '<img src="/a.png" data-align="middle">');
        expect(editor.getHTML()).not.toContain("data-align");
    });
    it("살균기가 새 속성을 살려 보낸다 — 허용 목록 정합", () => {
        const media = sanitizeHtml('<div data-video-src="https://www.youtube.com/embed/a" data-video-height="360" data-video-ratio="16:9" data-video-align="center" data-mbus-height="500" data-mbus-ratio="4:3" data-mbus-align="left"></div>');
        for (const attr of [
            'data-video-height="360"',
            'data-video-ratio="16:9"',
            'data-video-align="center"',
            'data-mbus-height="500"',
            'data-mbus-ratio="4:3"',
            'data-mbus-align="left"'
        ]) {
            expect(media).toContain(attr);
        }
        expect(sanitizeHtml('<img src="/a.png" width="480" data-align="center">')).toContain('data-align="center"');
    });
    /*
     * ⚠️ 강의영상(`tiptap-midibus`)은 `rawAttrs` 를 그대로 되뱉는 바이트 보존 노드라,
     * 높이 드래그가 `height` 속성만 바꾸면 저장본에는 옛 높이가 남는다. 드래그 커밋이
     * 하는 것과 같은 갱신(attrs + rawAttrs 동기)을 걸어 왕복을 확인한다.
     */
    it("TiptapMidibus — 높이 갱신이 rawAttrs 와 함께 가고 나머지는 바이트 보존", () => {
        const source = '<tiptap-midibus id="abc" start="5" uuid="u-1" width="100%" height="600" data-bubble-menu="false"></tiptap-midibus>';
        createEditor([TiptapMidibus], source);
        expect(editor.getHTML()).toContain('id="abc" start="5" uuid="u-1" width="100%" height="600" data-bubble-menu="false"');
        const found = findNode("tiptapMidibus");
        const raw = found.node.attrs.rawAttrs;
        // 높이 드래그 커밋과 같은 트랜잭션(`TiptapMidibus` 노드뷰의 `buildAttrs`)
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(found.pos, undefined, {
            ...found.node.attrs,
            height: "420",
            rawAttrs: { ...raw, height: "420" }
        }));
        expect(editor.getHTML()).toContain('id="abc" start="5" uuid="u-1" width="100%" height="420" data-bubble-menu="false"');
    });
});
/* ─────────────────────────── 툴바 — 선택 시에만, 편집 모드에만 ─────────────────────────── */
describe("MediaResizeToolbar 데코레이션", () => {
    let editor;
    const CONTENT = '<p>글</p><div data-video-src="https://player.vimeo.com/video/1"></div>';
    function createEditor(editable = true) {
        editor = new Editor({
            element: document.createElement("div"),
            extensions: [StarterKit, VideoEmbed, MediaResizeToolbar],
            content: CONTENT,
            editable
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    function videoPos() {
        let at = -1;
        editor.state.doc.descendants((node, pos) => {
            if (at >= 0)
                return false;
            if (node.type.name === "videoEmbed")
                at = pos;
            return at < 0;
        });
        return at;
    }
    it("미디어 노드를 선택하면 칩 줄이 서고, 선택을 풀면 사라진다", () => {
        createEditor();
        expect(editor.view.dom.querySelector(".hce-media-toolbar")).toBeNull();
        editor.commands.setNodeSelection(videoPos());
        const toolbar = editor.view.dom.querySelector(".hce-media-toolbar");
        expect(toolbar).not.toBeNull();
        // 비율 3 + 정렬 3 + 폭 2
        expect(toolbar.querySelectorAll(".hce-media-toolbar-chip").length).toBe(8);
        editor.commands.setTextSelection(1);
        expect(editor.view.dom.querySelector(".hce-media-toolbar")).toBeNull();
    });
    it("읽기 전용에는 절대 뜨지 않는다", () => {
        createEditor(false);
        editor.commands.setNodeSelection(videoPos());
        expect(editor.view.dom.querySelector(".hce-media-toolbar")).toBeNull();
    });
    it("칩 mousedown 이 속성을 바꾸고 저장본까지 간다", () => {
        createEditor();
        editor.commands.setNodeSelection(videoPos());
        const chip = editor.view.dom.querySelector('.hce-media-toolbar-chip[data-action="align"][data-value="center"]');
        expect(chip).not.toBeNull();
        chip.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        const node = editor.state.doc.nodeAt(videoPos());
        expect(node?.attrs.align).toBe("center");
        expect(editor.getHTML()).toContain('data-video-align="center"');
        // 툴바가 새 상태로 다시 그려져 칩이 켜져 있어야 한다
        const pressed = editor.view.dom.querySelector('.hce-media-toolbar-chip[data-action="align"][data-value="center"]');
        expect(pressed?.getAttribute("aria-pressed")).toBe("true");
    });
    it("비율 칩은 높이를 풀면서 들어간다", () => {
        createEditor();
        const pos = videoPos();
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...editor.state.doc.nodeAt(pos).attrs,
            height: "360"
        }));
        editor.commands.setNodeSelection(pos);
        const chip = editor.view.dom.querySelector('.hce-media-toolbar-chip[data-action="ratio"][data-value="4:3"]');
        chip.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
        const node = editor.state.doc.nodeAt(pos);
        expect(node?.attrs.ratio).toBe("4:3");
        expect(node?.attrs.height).toBeNull();
        const html = editor.getHTML();
        expect(html).toContain('data-video-ratio="4:3"');
        expect(html).not.toContain("data-video-height");
    });
});
