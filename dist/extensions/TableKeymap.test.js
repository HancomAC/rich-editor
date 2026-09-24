import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { CellSelection } from "@tiptap/pm/tables";
import { TableKeymap } from "./TableKeymap";
import { Indent } from "./Indent";
const NBSP = "\u00a0";
describe("TableKeymap", () => {
    let editor;
    /*
     * 등록 순서를 `TipTapEditor.svelte` 와 같게 둔다 — 표 계열 뒤에 `Indent`.
     * TipTap 키맵은 등록 역순이라 기본 priority 면 Indent 의 Tab 이 표를 가린다.
     * 이 테스트 절반은 그 순서 문제(priority 110)가 무너지지 않는지 잡는 것이다.
     */
    function createEditor(content) {
        editor = new Editor({
            element: document.createElement("div"),
            extensions: [StarterKit, Table, TableRow, TableHeader, TableCell, TableKeymap, Indent],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    function press(key, init = {}) {
        const event = new KeyboardEvent("keydown", { key, ...init });
        return editor.view.someProp("handleKeyDown", (f) => f(editor.view, event)) ?? false;
    }
    /** 본문 텍스트 `text` 가 시작하는 문서 위치. */
    function posOf(text) {
        let pos = -1;
        editor.state.doc.descendants((node, p) => {
            if (pos !== -1)
                return false;
            if (node.isText && node.text?.includes(text))
                pos = p;
            return pos === -1;
        });
        if (pos === -1)
            throw new Error(`"${text}" not found`);
        return pos;
    }
    /** 첫 셀(tableCell/tableHeader) 노드의 문서 위치. */
    function cellPositions() {
        const cells = [];
        editor.state.doc.descendants((node, p) => {
            if (node.type.name === "tableCell" || node.type.name === "tableHeader")
                cells.push(p);
            return true;
        });
        return cells;
    }
    function hasTable() {
        let found = false;
        editor.state.doc.descendants((node) => {
            if (node.type.name === "table")
                found = true;
            return !found;
        });
        return found;
    }
    function rowCount() {
        let rows = 0;
        editor.state.doc.descendants((node) => {
            if (node.type.name === "tableRow")
                rows += 1;
            return true;
        });
        return rows;
    }
    const TWO_CELLS = "<table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>";
    const EMPTY_TABLE = "<table><tbody><tr><td><p></p></td><td><p></p></td></tr></tbody></table><p>after</p>";
    it("Tab 은 다음 셀로 이동한다 — Indent 의 NBSP 삽입이 가로채지 않는다", () => {
        createEditor(TWO_CELLS);
        editor.commands.setTextSelection(posOf("a") + 1);
        expect(press("Tab")).toBe(true);
        expect(editor.state.selection.$from.parent.textContent).toBe("b");
        expect(editor.getText()).not.toContain(NBSP);
    });
    it("마지막 셀에서 Tab 은 행을 만들어 이동한다", () => {
        createEditor(TWO_CELLS);
        editor.commands.setTextSelection(posOf("b") + 1);
        expect(rowCount()).toBe(1);
        expect(press("Tab")).toBe(true);
        expect(rowCount()).toBe(2);
        /* 새 행의 첫 셀(빈 문단)에 있어야 한다. */
        expect(editor.state.selection.$from.parent.textContent).toBe("");
    });
    it("Shift-Tab 은 이전 셀로 이동한다", () => {
        createEditor(TWO_CELLS);
        editor.commands.setTextSelection(posOf("b") + 1);
        expect(press("Tab", { shiftKey: true })).toBe(true);
        expect(editor.state.selection.$from.parent.textContent).toBe("a");
    });
    it("표 밖 Tab 은 손대지 않는다 — Indent 가 그대로 동작한다", () => {
        createEditor("<p>outside</p>");
        editor.commands.setTextSelection(posOf("outside") + 1);
        expect(press("Tab")).toBe(true);
        expect(editor.getText()).toContain(NBSP.repeat(4));
    });
    it("빈 표 안에서 Backspace 는 표를 통째로 지운다", () => {
        createEditor(EMPTY_TABLE);
        /* 첫 셀의 빈 문단 안(셀 위치 +2)에 커서를 둔다. */
        editor.commands.setTextSelection(cellPositions()[0] + 2);
        expect(press("Backspace")).toBe(true);
        expect(hasTable()).toBe(false);
        expect(editor.getText()).toContain("after");
    });
    it("빈 표 안에서 Delete 도 표를 지운다", () => {
        createEditor(EMPTY_TABLE);
        editor.commands.setTextSelection(cellPositions()[0] + 2);
        expect(press("Delete")).toBe(true);
        expect(hasTable()).toBe(false);
    });
    it("내용이 있는 표에서는 Backspace 로 표를 지우지 않는다", () => {
        createEditor(TWO_CELLS);
        editor.commands.setTextSelection(posOf("a"));
        press("Backspace");
        expect(hasTable()).toBe(true);
        expect(editor.getText()).toContain("a");
    });
    it("표 전체 셀 선택 + Backspace 는 표를 지운다", () => {
        createEditor(TWO_CELLS);
        const cells = cellPositions();
        const sel = CellSelection.create(editor.state.doc, cells[0], cells[cells.length - 1]);
        editor.view.dispatch(editor.state.tr.setSelection(sel));
        expect(press("Backspace")).toBe(true);
        expect(hasTable()).toBe(false);
    });
    it("열 전체 선택 + Backspace 는 그 열만 지운다", () => {
        createEditor("<table><tbody>" +
            "<tr><td><p>a</p></td><td><p>b</p></td></tr>" +
            "<tr><td><p>c</p></td><td><p>d</p></td></tr>" +
            "</tbody></table>");
        const sel = CellSelection.colSelection(editor.state.doc.resolve(cellPositions()[0]));
        editor.view.dispatch(editor.state.tr.setSelection(sel));
        expect(press("Backspace")).toBe(true);
        expect(hasTable()).toBe(true);
        expect(editor.getText()).not.toContain("a");
        expect(editor.getText()).toContain("b");
    });
});
