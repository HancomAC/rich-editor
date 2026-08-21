import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * 노드뷰에 드래그 리사이즈 손잡이를 단다.
 *
 * 원래 `PdfBlock` 과 `MbusVideo` 가 **같은 코드를 복붙**해서 각자 들고 있었다(변수명·매직넘버·
 * cssText 문자열까지 동일). 세 번째 소비자(카드)가 생기면서 한 곳으로 모은다.
 *
 * 합치면서 세 가지가 달라졌다:
 *
 * 1. **세로 축이 생겼다.** 기존 둘은 가로(폭)만 있었다. 카드·접기처럼 내용이 흐르는 블록은
 *    폭보다 높이를 잡고 싶다.
 * 2. **`node` 를 getter 로 받는다.** 기존 코드는 `addNodeView` 클로저가 잡은 `node` 를 그대로
 *    `setNodeMarkup(pos, undefined, {...node.attrs, width})` 에 썼다. 그 사이 다른 속성이
 *    바뀌었으면 **리사이즈가 그 변경을 되돌려 버린다.** 항상 최신 노드를 읽도록 바꿨다.
 * 3. **정리 함수를 돌려준다.** 기존엔 `destroy()` 에서 손잡이 리스너를 떼지 않았다.
 *
 * ⚠️ 손잡이는 `position:absolute` 로 노드뷰 밖 12px 을 침범한다. 부모가 `overflow:hidden` 이면
 *    잘려서 안 보인다(`editor.css` 가 `padding-right:4px` 로 땜빵 중인 이유).
 */

export type ResizeAxis = "x" | "y";

export interface AttachResizeOptions {
	/** 크기를 실제로 먹일 요소. 보통 노드뷰 루트(`dom`). */
	dom: HTMLElement;
	editor: Editor;
	getPos: () => number | undefined;
	/** ⚠️ 값이 아니라 **getter**. 클로저가 낡은 노드를 잡는 것을 막는다. */
	getNode: () => ProseMirrorNode;
	/** 기본 `'x'`(폭). `'y'` 면 높이를 조절한다. */
	axis?: ResizeAxis;
	/** 크기를 저장할 노드 속성 이름. 기본은 축에 따라 `width` / `height`. */
	attr?: string;
	min?: number;
	max?: number;
	/** 스크린리더용 이름. 예: `'PDF 너비 조절'` */
	label?: string;
	/** 저장 형식. 기본은 `'240px'` 같은 px 문자열. */
	format?: (value: number) => string;
}

const DEFAULTS = {
	x: { min: 240, max: 1600, label: "너비 조절", cursor: "ew-resize" },
	y: { min: 120, max: 900, label: "높이 조절", cursor: "ns-resize" }
} as const;

const IDLE = "var(--border, #d1d5db)";
const ACTIVE = "var(--primary, #3382f2)";

export function attachResize(options: AttachResizeOptions): () => void {
	const {
		dom,
		editor,
		getPos,
		getNode,
		axis = "x",
		attr = axis === "x" ? "width" : "height",
		format = (v: number) => `${Math.round(v)}px`
	} = options;

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

	const paint = (active: boolean) => {
		bar.style.background = active ? ACTIVE : IDLE;
	};

	const onEnter = () => paint(true);
	const onLeave = () => {
		if (!resizing) paint(false);
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
	const onPointerMove = (e: PointerEvent) => {
		if (!resizing) return;
		const delta = (axis === "x" ? e.clientX : e.clientY) - start;
		const next = Math.max(min, Math.min(max, startSize + delta));
		if (axis === "x") dom.style.width = `${next}px`;
		else dom.style.height = `${next}px`;
	};

	const endResize = () => {
		if (!resizing) return;
		resizing = false;
		paint(false);
		detachWindow();
		document.body.style.removeProperty("user-select");
		document.body.style.removeProperty("cursor");

		const raw = axis === "x" ? dom.style.width : dom.style.height;
		if (!raw) return;
		const pos = getPos();
		if (pos == null) return;

		const parsed = Number.parseFloat(raw);
		if (!Number.isFinite(parsed)) return;

		// ⚠️ `getNode()` — 클로저가 잡아 둔 낡은 노드를 쓰면 리사이즈가 그 사이의 다른
		//    속성 변경을 되돌린다(복붙 시절의 버그).
		const node = getNode();
		editor.view.dispatch(
			editor.view.state.tr.setNodeMarkup(pos, undefined, {
				...node.attrs,
				[attr]: format(parsed)
			})
		);
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

	const onPointerDown = (e: PointerEvent) => {
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
