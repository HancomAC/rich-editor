import { Extension } from "@tiptap/core";
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
export declare const TableKeymap: Extension<any, any>;
//# sourceMappingURL=TableKeymap.d.ts.map