import { Extension } from "@tiptap/core";
import type { KeyboardShortcutCommand } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * 표 안에 실제 내용(글자·이미지·수식 같은 리프 노드)이 하나도 없는가.
 * 행·셀·빈 문단 같은 구조물만 있으면 빈 표로 본다.
 */
function isTableEmpty(table: PMNode): boolean {
	let empty = true;
	table.descendants((node) => {
		if (!empty) return false;
		if (node.isText || node.isLeaf) {
			empty = false;
			return false;
		}
		return true;
	});
	return empty;
}

/**
 * Backspace/Delete 로 표를 정리한다. (main 정올 `plugin/table/deleteTable.ts` 참조 —
 * 로직 재작성. 열·행 판정은 TableMap 순회 대신 `CellSelection` 의 자체 판정을 쓴다.)
 *
 *   · 셀 선택(CellSelection)이 표 전체를 덮으면 → 표 삭제, 열 전체 → 열 삭제, 행 전체 → 행 삭제
 *   · 커서(TextSelection)가 **빈 표** 안에 있으면 → 표를 통째로 삭제
 *
 * 그 밖에는 전부 false — 셀 안의 글자 지우기 같은 기본 동작에 끼어들지 않는다.
 */
const deleteTableOrSelection: KeyboardShortcutCommand = ({ editor }) => {
	if (!editor.isEditable) return false;
	const { selection } = editor.state;

	if (selection instanceof CellSelection) {
		const col = selection.isColSelection();
		const row = selection.isRowSelection();
		if (col && row) return editor.commands.deleteTable();
		if (col) return editor.commands.deleteColumn();
		if (row) return editor.commands.deleteRow();
		return false;
	}

	if (!selection.empty) return false;
	const { $from } = selection;
	for (let d = $from.depth; d > 0; d--) {
		const node = $from.node(d);
		if (node.type.name !== "table") continue;
		if (!isTableEmpty(node)) return false;
		return editor.commands.deleteTable();
	}
	return false;
};

/**
 * 표 키보드 동작: `Tab` 다음 셀(마지막 셀이면 행을 만들어 이동), `Shift-Tab` 이전 셀,
 * `Backspace`/`Delete` 로 빈 표·선택된 열/행/표 삭제. (main 정올
 * `plugin/table/index.ts` 의 `addKeyboardShortcuts` 참조 — 로직 재작성.)
 *
 * ⚠️ **업스트림 `Table` 에도 같은 Tab 단축키가 있는데 왜 또 다는가** — TipTap 은 키맵
 * 플러그인을 **등록 역순 + priority 내림차순**으로 배치한다(core 의
 * `sortExtensions([...this.extensions].reverse())`). `TipTapEditor.svelte` 에서 `Indent` 가
 * 표보다 **뒤에** 등록돼 있어, 기본 priority 로는 표 안에서도 Indent 의 Tab(NBSP 삽입)이
 * 먼저 먹어 셀 이동이 죽는다. 그래서 여기만 priority 를 올려 표 안에서는 셀 이동이
 * 이기게 한다. 표 밖에서는 모든 핸들러가 false 를 돌려주므로 Indent·리스트 들여쓰기는
 * 그대로다.
 */
export const TableKeymap = Extension.create({
	name: "tableKeymap",
	priority: 110,

	addKeyboardShortcuts() {
		return {
			Tab: () => {
				/* 읽기 전용에서도 keydown 은 들어온다 — 행 추가까지 가지 않게 막는다. */
				if (!this.editor.isEditable) return false;
				if (this.editor.commands.goToNextCell()) return true;
				/* 마지막 셀: 행을 하나 만들어 이어서 이동. 표 밖에서는 둘 다 실패해 false. */
				if (!this.editor.can().addRowAfter()) return false;
				return this.editor.chain().addRowAfter().goToNextCell().run();
			},
			"Shift-Tab": () => {
				if (!this.editor.isEditable) return false;
				return this.editor.commands.goToPreviousCell();
			},
			Backspace: deleteTableOrSelection,
			"Mod-Backspace": deleteTableOrSelection,
			Delete: deleteTableOrSelection,
			"Mod-Delete": deleteTableOrSelection
		};
	}
});
