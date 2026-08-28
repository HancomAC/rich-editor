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
export function insertTableSized(editor, opts) {
    const { rows, cols, withHeaderRow } = opts;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
    const per = columnWidth(editor, cols);
    if (!per)
        return;
    const { state } = editor;
    const { $from } = state.selection;
    /* 방금 만든 표를 selection 조상에서 찾는다. */
    let tableNode = null;
    let tablePos = -1;
    for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === "table") {
            tableNode = node;
            tablePos = $from.before(d);
            break;
        }
    }
    const firstRow = tableNode?.firstChild;
    if (!tableNode || !firstRow)
        return;
    /*
     * 첫 행의 셀들에만 넣으면 된다 — `colwidth` 는 열 단위라 나머지 행은 따라온다.
     * 위치: 표 시작(+1) → 첫 행 시작(+1) → 첫 셀.
     */
    const tr = state.tr;
    let pos = tablePos + 2;
    firstRow.forEach((cell) => {
        tr.setNodeMarkup(pos, undefined, { ...cell.attrs, colwidth: [per] });
        pos += cell.nodeSize;
    });
    editor.view.dispatch(tr);
}
/**
 * 열 하나에 줄 픽셀 너비. 본문에서 좌우 여백을 뺀 폭을 열 수로 나눈다.
 *
 * ⚠️ 테두리 때문에 딱 나누어떨어지지 않는다. 조금 **작게** 잡아야 표가 컨테이너를 넘겨
 * 가로 스크롤을 만들지 않는다.
 */
function columnWidth(editor, cols) {
    const dom = editor.view.dom;
    if (!dom?.clientWidth)
        return null;
    const cs = getComputedStyle(dom);
    const inner = dom.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
    if (!Number.isFinite(inner) || inner <= 0)
        return null;
    /* 표 테두리(2px)와 셀 경계 몫을 덜어 낸다. */
    const usable = inner - 2 - cols;
    /* `cellMinWidth` 기본값(25) 아래로는 의미가 없다. */
    return Math.max(25, Math.floor(usable / cols));
}
