import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Plugin } from "@tiptap/pm/state";
import { Slice } from "@tiptap/pm/model";
import { lowlight } from "./lowlight";
import { guardVSCodePaste } from "./guard-vscode-paste";
/*
 * 업스트림 `codeBlockVSCodeHandler` 는 클립보드의 `vscode-editor-data` 를 try/catch 없이
 * `JSON.parse` 한다 — 깨진 메타데이터가 실리면 붙여넣기 한 번에 던진다. 이 가드는
 * 메타데이터를 먼저 검증하고, 멀쩡할 때만 원래 핸들러에 넘긴다.
 *
 * `TipTapEditor.svelte` 의 `GuardedCodeBlockLowlight` 와 같은 조합으로 에디터를 세워,
 * 실제 플러그인 사슬(someProp)로 붙여넣기를 흉내 낸다.
 */
const GuardedCodeBlockLowlight = CodeBlockLowlight.extend({
    addProseMirrorPlugins() {
        return (this.parent?.() ?? []).map((plugin) => guardVSCodePaste(plugin));
    }
});
describe("guardVSCodePaste", () => {
    let editor;
    function createEditor(content = "<p></p>") {
        editor = new Editor({
            element: document.createElement("div"),
            extensions: [
                StarterKit.configure({ codeBlock: false }),
                GuardedCodeBlockLowlight.configure({ lowlight, defaultLanguage: "cpp" })
            ],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    /** 클립보드 타입 → 값 맵으로 붙여넣기를 흉내 낸다. 핸들러는 getData 만 쓴다. */
    function paste(data) {
        const event = {
            clipboardData: { getData: (type) => data[type] ?? "" }
        };
        return (editor.view.someProp("handlePaste", (f) => f(editor.view, event, Slice.empty)) ?? false);
    }
    function hasCodeBlock() {
        return (editor.getJSON().content ?? []).some((node) => node.type === "codeBlock");
    }
    it("깨진 JSON 메타데이터가 실려도 던지지 않는다", () => {
        createEditor();
        let handled = true;
        expect(() => {
            handled = paste({
                "vscode-editor-data": "{broken json",
                "text/plain": "print(1)"
            });
        }).not.toThrow();
        expect(handled).toBe(false);
        expect(hasCodeBlock()).toBe(false);
    });
    it("mode 가 문자열이 아니면 코드블록을 만들지 않는다", () => {
        createEditor();
        expect(paste({ "vscode-editor-data": '{"mode":42}', "text/plain": "x" })).toBe(false);
        expect(paste({ "vscode-editor-data": "null", "text/plain": "x" })).toBe(false);
        expect(paste({ "vscode-editor-data": '"python"', "text/plain": "x" })).toBe(false);
        expect(hasCodeBlock()).toBe(false);
    });
    it("정상 메타데이터는 그대로 코드블록이 된다 — 가드가 동작을 바꾸지 않는다", () => {
        createEditor();
        const handled = paste({
            "vscode-editor-data": '{"mode":"python"}',
            "text/plain": "print(1)"
        });
        expect(handled).toBe(true);
        const block = (editor.getJSON().content ?? []).find((node) => node.type === "codeBlock");
        expect(block?.attrs?.language).toBe("python");
    });
    it("메타데이터가 없으면 업스트림 판단(언어 없음 → 미처리)에 맡긴다", () => {
        createEditor();
        expect(paste({ "text/plain": "plain text" })).toBe(false);
        expect(hasCodeBlock()).toBe(false);
    });
    it("handlePaste 없는 플러그인은 정체 그대로 돌려준다", () => {
        const plain = new Plugin({});
        expect(guardVSCodePaste(plain)).toBe(plain);
    });
});
