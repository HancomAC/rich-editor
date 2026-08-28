import type { Editor } from "@tiptap/core";
import { TableMap, splitCellWithType } from "@tiptap/pm/tables";
import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * 셀 분할 — **헤더 표시를 원래 자리로 되돌린다**.
 *
 * ⚠️ 기본 `splitCell()` 은 나눈 조각을 **원래 셀 타입 그대로** 만든다. 그런데 헤더 셀과
 * 일반 셀을 병합하면 결과가 `tableHeader` 가 되므로, 그걸 다시 나누면 **원래 일반 셀이던
 * 자리까지 전부 헤더로 남는다.** 그 상태는 `헤더 행/열 토글` 로도 못 고친다 — 그건 행·열
 * 전체를 뒤집는 것이라 표 한가운데 남은 헤더 셀에는 닿지 않는다(사용자 지적: "헤더표시가
 * 남아서 없앨수가 없어").
 *
 * 그래서 나눌 때 **자리에 맞는 타입**을 직접 정해 준다:
 *   · 표에 헤더 행이 있으면 → 첫 행 조각은 헤더
 *   · 표에 헤더 열이 있으면 → 첫 열 조각은 헤더
 *   · 그 밖은 전부 일반 셀
 *
 * ⚠️ "헤더 행이 있는가" 는 **병합에 끼지 않은 셀**로 판정한다. 병합 결과 셀은 그 자체가
 * 헤더 타입일 수 있어서, 그걸 근거로 삼으면 "헤더가 있다" 고 잘못 읽는다.
 */
export function splitCellPreservingHeaders(editor: Editor): boolean {
	const { state, view } = editor;
	const { schema, selection } = state;

	const headerType = schema.nodes.tableHeader;
	const cellType = schema.nodes.tableCell;
	if (!headerType || !cellType) return editor.chain().focus().splitCell().run();

	/* 지금 셀이 속한 표를 찾는다. */
	const $from = selection.$from;
	let table: PMNode | null = null;
	for (let d = $from.depth; d > 0; d--) {
		const node = $from.node(d);
		if (node.type.name === "table") {
			table = node;
			break;
		}
	}
	if (!table) return editor.chain().focus().splitCell().run();

	const map = TableMap.get(table);

	/** (r,c) 자리의 셀. 병합된 자리는 같은 셀을 여러 번 가리킨다. */
	const cellAt = (r: number, c: number): PMNode | null => {
		const pos = map.map[r * map.width + c];
		return pos === undefined ? null : table!.nodeAt(pos);
	};
	/** 그 자리가 **자기 칸 하나만 차지하는** 셀인지 — 병합 셀은 근거로 쓰지 않는다. */
	const isPlain = (r: number, c: number): boolean => {
		const cell = cellAt(r, c);
		if (!cell) return false;
		const { colspan = 1, rowspan = 1 } = cell.attrs as {
			colspan?: number;
			rowspan?: number;
		};
		return colspan === 1 && rowspan === 1;
	};
	const isHeader = (r: number, c: number) => cellAt(r, c)?.type === headerType;

	let hasHeaderRow = false;
	for (let c = 0; c < map.width; c++) {
		if (isPlain(0, c) && isHeader(0, c)) {
			hasHeaderRow = true;
			break;
		}
	}
	let hasHeaderCol = false;
	for (let r = 0; r < map.height; r++) {
		if (isPlain(r, 0) && isHeader(r, 0)) {
			hasHeaderCol = true;
			break;
		}
	}

	return splitCellWithType(({ row, col }) => {
		if (hasHeaderRow && row === 0) return headerType;
		if (hasHeaderCol && col === 0) return headerType;
		return cellType;
	})(state, view.dispatch);
}
