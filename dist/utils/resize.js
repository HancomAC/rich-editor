const DEFAULTS = {
    x: { min: 240, max: 1600, label: "너비 조절", cursor: "ew-resize" },
    y: { min: 120, max: 900, label: "높이 조절", cursor: "ns-resize" }
};
/*
 * ⚠️ **손잡이 색에 `--border` 를 그대로 쓰면 안 된다.** 그건 **구분선** 색이라 눈에
 * 안 띄게 맞춰 둔 값이다. 다크에서 정올 실측 `#323232` 가 카드(`#1a1a1a`) 위 대비
 * **1.36** — 3px 짜리 막대가 배경에 그냥 묻혔다(사용자 지적: 잘 안 보인다).
 *
 * 이건 선이 아니라 **잡아 끄는 물건**이라 찾을 수 있어야 한다. 글자색을 섞어 면에서
 * 떼어낸다 — 라이트에서는 어두워지고 다크에서는 밝아지므로 **어느 테마에서든
 * "배경에서 떨어져 나오는" 방향**이 된다(떠 있는 판 `.hce-floating-panel` 과 같은 축).
 *
 * 비율 45% 는 **양쪽 테마가 동시에 3:1(비문자 UI 기준)을 넘는 지점**이다. 40% 로는
 * 라이트가 못 넘는다 — 실측 `#979799` 가 흰 바탕 위 **2.93**. 정올 실측 대비:
 * 라이트 1.06 → 3.4, 다크 1.36 → 4.0.
 *
 * ⚠️ 라이트 값을 잴 때 **화면에서 테마를 토글한 직후를 믿지 말 것.** 자동화 탭에서
 * `data-theme` 만 바뀌고 손잡이는 다크 값을 그대로 들고 있었다(측정 4.81 → 새로 연
 * 탭에서는 2.93). 테마별 측정은 **새 탭을 열어** 한다.
 */
const IDLE = "color-mix(in srgb, var(--foreground, #111827) 45%, var(--border, #d1d5db))";
const ACTIVE = "var(--primary, #3382f2)";
export function attachResize(options) {
    const { dom, editor, getPos, getNode, axis = "x", attr = axis === "x" ? "width" : "height", format = (v) => `${Math.round(v)}px` } = options;
    const preset = DEFAULTS[axis];
    const min = options.min ?? preset.min;
    const max = options.max ?? preset.max;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.contentEditable = "false";
    handle.className = "hce-resize-handle";
    handle.setAttribute("aria-label", options.label ?? preset.label);
    handle.dataset.resizeAxis = axis;
    handle.style.cssText =
        axis === "x"
            ? "position:absolute;right:-12px;top:0;bottom:0;width:14px;padding:0;margin:0;border:0;background:transparent;cursor:ew-resize;z-index:2;display:flex;align-items:center;justify-content:center;"
            : "position:absolute;left:0;right:0;bottom:-12px;height:14px;padding:0;margin:0;border:0;background:transparent;cursor:ns-resize;z-index:2;display:flex;align-items:center;justify-content:center;";
    const bar = document.createElement("span");
    bar.style.cssText =
        axis === "x"
            ? `display:block;width:3px;height:48px;background:${IDLE};border-radius:2px;transition:background 0.15s;pointer-events:none;`
            : `display:block;width:48px;height:3px;background:${IDLE};border-radius:2px;transition:background 0.15s;pointer-events:none;`;
    handle.appendChild(bar);
    let resizing = false;
    let start = 0;
    let startSize = 0;
    const paint = (active) => {
        bar.style.background = active ? ACTIVE : IDLE;
    };
    const onEnter = () => paint(true);
    const onLeave = () => {
        if (!resizing)
            paint(false);
    };
    /*
     * ⚠️ **`setPointerCapture` 에 기대지 않는다.**
     *
     * 손잡이는 14px 밖에 안 되는데 드래그는 그 밖으로 한참 벗어난다. 캡처가 잡히면 그래도
     * 이벤트가 오지만, 캡처는 조용히 실패할 수 있다(합성 포인터·다른 요소가 이미 캡처를
     * 쥔 경우 등). 그러면 `pointermove`/`pointerup` 이 손잡이에 안 오고, 드래그가 커밋되지
     * 않은 채 원래 크기로 되돌아간다 — 에러 없이.
     *
     * 그래서 `pointerdown` 에서 **window 에 붙였다 떼는** 방식으로 간다. 캡처 실패에도,
     * 포인터가 창 밖으로 나가도 견딘다.
     */
    const onPointerMove = (e) => {
        if (!resizing)
            return;
        const delta = (axis === "x" ? e.clientX : e.clientY) - start;
        const next = Math.max(min, Math.min(max, startSize + delta));
        if (axis === "x")
            dom.style.width = `${next}px`;
        else
            dom.style.height = `${next}px`;
    };
    const endResize = () => {
        if (!resizing)
            return;
        resizing = false;
        paint(false);
        detachWindow();
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");
        const raw = axis === "x" ? dom.style.width : dom.style.height;
        if (!raw)
            return;
        const pos = getPos();
        if (pos == null)
            return;
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed))
            return;
        // ⚠️ `getNode()` — 클로저가 잡아 둔 낡은 노드를 쓰면 리사이즈가 그 사이의 다른
        //    속성 변경을 되돌린다(복붙 시절의 버그).
        const node = getNode();
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [attr]: format(parsed)
        }));
    };
    const attachWindow = () => {
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", endResize);
        window.addEventListener("pointercancel", endResize);
    };
    const detachWindow = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", endResize);
        window.removeEventListener("pointercancel", endResize);
    };
    const onPointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        const rect = dom.getBoundingClientRect();
        start = axis === "x" ? e.clientX : e.clientY;
        startSize = axis === "x" ? rect.width : rect.height;
        paint(true);
        // 드래그 중 텍스트가 선택되며 파랗게 물드는 것을 막는다.
        document.body.style.userSelect = "none";
        document.body.style.cursor = preset.cursor;
        attachWindow();
    };
    handle.addEventListener("mouseenter", onEnter);
    handle.addEventListener("mouseleave", onLeave);
    handle.addEventListener("pointerdown", onPointerDown);
    dom.appendChild(handle);
    return () => {
        handle.removeEventListener("mouseenter", onEnter);
        handle.removeEventListener("mouseleave", onLeave);
        handle.removeEventListener("pointerdown", onPointerDown);
        detachWindow();
        handle.remove();
    };
}
