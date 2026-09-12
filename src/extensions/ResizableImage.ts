import Image from "@tiptap/extension-image";
import { attachResize } from "../utils/resize";
import { normalizeMediaAlign } from "../utils/media-size";
import { getEditorTranslator } from "../i18n";

/**
 * 드래그로 폭을 조절할 수 있는 이미지.
 *
 * **새 노드가 아니라 `@tiptap/extension-image` 의 확장**이다. 저장본에 이미 쌓여 있는
 * 이미지가 전부 `image` 노드라서, 새 타입을 만들면 옛 문서가 통째로 다른 것이 된다.
 *
 * ## 왜 `style` 이 아니라 `width` 속성인가
 *
 * 정올은 문항 목록에서 **저장 HTML 을 `{@html}` 로 먼저 그리면서** `sanitizeHtml` 을
 * 태운다. 그 살균기의 `img` 허용 목록은 `src·alt·width·height` 뿐이라 **`style` 은
 * 조용히 지워진다**(`utils/sanitize.ts`). 폭을 인라인 `style` 로 저장하면 정적 렌더에서는
 * 원래 크기로 나왔다가 에디터가 뜨는 순간 조절한 크기로 튄다. 그래서 저장 형식은
 * 단위 없는 px 숫자 `<img width="480">` 하나로 고정한다.
 *
 * ## 파싱은 관대하게, 쓰기는 좁게
 *
 * 읽을 때는 `width="480"` · `width="480px"` · `style="width:480px"` 을 모두 받는다
 * (옛 문서·붙여넣기 대비). 쓸 때는 언제나 `width="480"` 한 가지다.
 *
 * ⚠️ **폭이 없는 문서는 `null` 로 둔다.** 열었다 저장하는 것만으로 크기가 박히면,
 * 손대지 않은 이미지가 그 시점의 렌더 폭에 고정돼 반응형이 죽는다.
 * `%` 값은 px 로 환산하지 않고 그냥 무시한다(=`null`) — 환산하려면 컨테이너 폭을
 * 알아야 하는데 파싱 시점엔 없다.
 *
 * ## 왜 `Image` 내장 리사이즈(`options.resize`)를 안 쓰나
 *
 * TipTap v3 의 `Image` 에는 `ResizableNodeView` 기반 리사이즈가 들어 있지만,
 * (1) `width`·`height` 를 **둘 다** 쓰고 (2) 손잡이 모양이 이 패키지의 PDF·영상·카드와
 * 다르다. 미디어 블록끼리 조작감이 갈리지 않도록 공용 `attachResize` 로 통일한다.
 */

/** 기본 최소값 240px 은 이미지엔 너무 크다 — 아이콘·뱃지 크기까지 줄일 수 있어야 한다. */
const MIN_WIDTH = 60;

/**
 * 어떤 꼴로 들어오든 단위 없는 px 정수로 만든다. 못 읽으면 `null`.
 *
 * `%`·`em`·`auto` 처럼 px 로 환산할 수 없는 값은 **버린다**. 억지로 숫자를 뽑으면
 * `50%` 가 `50px` 이 되어 이미지가 손톱만 해진다.
 */
export function normalizeImageWidth(value: unknown): number | null {
	if (value == null) return null;
	if (typeof value === "number") {
		return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
	}
	const raw = String(value).trim();
	if (!raw) return null;
	const m = /^(\d+(?:\.\d+)?)(px)?$/i.exec(raw);
	if (!m) return null;
	const n = Number.parseFloat(m[1]);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.round(n);
}

export const ResizableImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default: null,
				parseHTML: (element) => {
					const fromAttr = normalizeImageWidth(element.getAttribute("width"));
					if (fromAttr != null) return fromAttr;
					// `style="width:480px"` 로만 크기가 박힌 옛 문서.
					return normalizeImageWidth(element.style?.width ?? null);
				},
				// ⚠️ 값이 없으면 **속성을 아예 내보내지 않는다.** 빈 `width=""` 도 안 된다 —
				//    옛 문서와 출력이 구분되지 않아야 한다.
				renderHTML: (attributes) => {
					const w = normalizeImageWidth(attributes.width);
					return w == null ? {} : { width: String(w) };
				}
			},
			/*
			 * 좌/중/우 정렬(미디어 툴바). `width` 와 같은 이유로 `style` 이 아니라 **속성**
			 * (`data-align`)으로 간다 — 살균기의 `img` 허용 목록에 이 이름을 넣어 두었고,
			 * 읽기 화면에서는 `editor.css` 의 `.tiptap img[data-align=…]` 규칙이 받는다.
			 */
			align: {
				default: null,
				parseHTML: (element) => normalizeMediaAlign(element.getAttribute("data-align")),
				renderHTML: (attributes) => {
					const align = normalizeMediaAlign(attributes.align);
					return align ? { "data-align": align } : {};
				}
			}
		};
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			// 리사이즈가 `setNodeMarkup` 으로 attrs 를 통째로 되쓰므로 **항상 최신 노드**여야
			// 한다. 클로저의 `node` 를 쓰면 그 사이의 다른 속성 변경을 리사이즈가 되돌린다.
			let currentNode = node;
			let detachResize: (() => void) | null = null;

			/*
			 * `<img>` 에는 자식을 붙일 수 없다 — 손잡이를 놓을 자리가 없다. 그래서
			 * `position:relative` 인 래퍼로 감싼다. 폭은 **래퍼**가 갖고 이미지는
			 * `width:100%` 로 따라간다(스타일은 `editor.css` 의 `.hce-image`).
			 */
			const dom = document.createElement("div");
			dom.className = "hce-image";
			dom.setAttribute("data-type", "image");
			dom.setAttribute("data-node-view-wrapper", "");

			const img = document.createElement("img");
			dom.appendChild(img);

			const applyAttrs = (attrs: Record<string, unknown>) => {
				const src = attrs.src == null ? "" : String(attrs.src);
				if (img.getAttribute("src") !== src) img.setAttribute("src", src);
				img.setAttribute("alt", attrs.alt == null ? "" : String(attrs.alt));
				if (attrs.title == null) img.removeAttribute("title");
				else img.setAttribute("title", String(attrs.title));

				const w = normalizeImageWidth(attrs.width);
				if (w == null) dom.style.removeProperty("width");
				else dom.style.width = `${w}px`;

				/* 정렬은 래퍼의 마진으로 — `width: fit-content` 라 `auto` 마진이 그대로 먹는다. */
				const align = normalizeMediaAlign(attrs.align);
				dom.style.marginLeft = align === "center" || align === "right" ? "auto" : "";
				dom.style.marginRight = align === "center" ? "auto" : "";
			};
			applyAttrs(node.attrs);

			if (editor.isEditable) {
				detachResize = attachResize({
					dom,
					editor,
					getPos: () => (typeof getPos === "function" ? getPos() : undefined),
					getNode: () => currentNode,
					axis: "x",
					attr: "width",
					min: MIN_WIDTH,
					label: getEditorTranslator(editor)("imageResizeWidth"),
					// 저장 형식은 단위 없는 숫자 — 살균기가 `style` 을 지우므로 `width` 속성으로 간다.
					format: (v) => String(Math.round(v))
				});
			}

			/*
			 * ⚠️ `selectNode`/`deselectNode` 를 **정의하지 않는다.** 빈 함수로라도 두는 순간
			 *    ProseMirror 가 `ProseMirror-selectednode` 클래스를 직접 붙이지 않고 그 콜백에
			 *    맡겨 버려서, 선택 테두리 CSS 가 통째로 죽는다(PDF 재설계 때 실제로 밟았다).
			 */
			return {
				dom,
				update: (updated) => {
					if (updated.type !== currentNode.type) return false;
					applyAttrs(updated.attrs);
					currentNode = updated;
					return true;
				},
				destroy: () => {
					detachResize?.();
				}
			};
		};
	}
});

export default ResizableImage;
