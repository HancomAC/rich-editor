import type { Editor } from "@tiptap/core";
/**
 * 표를 넣되 **열 너비를 미리 박아 둔다**.
 *
 * ⚠️ 왜 필요한가 — `insertTable` 만 부르면 열에 `colwidth` 가 없다. 그 상태에서 표를
 * 화면 폭에 맞추려면 CSS 로 `table { width: 100% }` 를 거는 수밖에 없는데, 그러면
 * **표 전체 폭이 컨테이너에 묶여** 맨 오른쪽 열을 줄여도 앞 열들이 그만큼 늘어나
 * 상쇄된다 — 표 크기가 안 줄어드는 것처럼 보인다(사용자 지적, A/B 로 재현:
 * `width:100%` 없을 때 표 182px / 있을 때 407px 고정에 마지막 열만 55px).
 *
 * 열 너비를 처음부터 넣어 두면 **표 폭 = `colwidth` 합**이 되어, 처음엔 화면을 꽉 채우고
 * 이후에는 어느 열이든 끌어서 표를 줄일 수 있다.
 *
 * ⚠️ 옛 문서의 표에는 `colwidth` 가 없다. 그쪽이 좁아지지 않도록 CSS 는
 * **`colwidth` 가 없는 표에만** `width: 100%` 를 건다(소비 앱 `layout`/`TipTap.svelte`).
 */
export declare function insertTableSized(editor: Editor, opts: {
    rows: number;
    cols: number;
    withHeaderRow: boolean;
}): void;
//# sourceMappingURL=table.d.ts.map