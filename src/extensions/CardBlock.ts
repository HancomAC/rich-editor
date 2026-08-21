import { Node, mergeAttributes } from "@tiptap/core";
import { attachResize } from "../utils/resize";

/**
 * 카드 블록 — 본문 중간에 넣는 **배경 있는 상자**.
 *
 * 제목 한 줄 + 자유 내용, 배경은 그라디언트·단색·이미지 어느 쪽이든 CSS `background` 문자열로
 * 받는다. 원래 정올(`apps/jungol/src/components/ui/tiptap/card/`)에만 있던 것을 패키지로 올렸다.
 *
 * ## 이식하면서 달라진 것
 *
 * - **NodeView 를 vanilla JS 로 다시 썼다.** 원본은 `SvelteNodeViewRenderer` 였는데, 이 패키지의
 *   확장은 전부 vanilla 다(`.claude/rules/rich-editor.md`). Svelte 런타임을 노드뷰에 끌어들이면
 *   호스트 앱과 Svelte 사본이 갈릴 때 조용히 깨진다.
 * - **배경 고르기 UI 를 패키지가 갖지 않는다.** 원본 피커는 Unsplash 검색·파일 업로드·스낵바까지
 *   앱에 묶여 있었다. 대신 `onPromptLink` 와 같은 **핸들러 규약**으로 뺐다 —
 *   호스트가 `editor.storage.card.promptBackground` 를 채우면 그걸 부르고, 없으면 `window.prompt`.
 * - **높이 조절은 공용 `attachResize`** 를 쓴다. 원본은 seorii 패키지의 `MediaResize` 가
 *   `data-resize-*` 플래그를 보고 붙여 주던 것이라, 그 패키지를 떠나면 같이 사라졌다.
 *
 * ## 저장 형식
 *
 * 새로 저장하는 것은 `div[data-type="card"]` 다. 옛 정올 문서의 `<tiptap-card>` 는
 * `parseHTML` 이 직접 받고, 서버에 남은 문자열은 `transformLegacyHtml` 이 바꾼다
 * (file·collapsable·midibus 와 같은 경로).
 */

const DEFAULT_BACKGROUND =
	"linear-gradient(135deg, #f8fafc 0%, #e0f2fe 55%, #fef3c7 100%)";
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 640;
const DEFAULT_HEIGHT = 190;

/** 배경 문자열을 받아 새 값(취소면 null)을 돌려주는 호스트 훅. */
export type CardBackgroundPrompt = (current: string) => Promise<string | null>;

export interface CardBlockOptions {
	HTMLAttributes: Record<string, unknown>;
	promptBackground: CardBackgroundPrompt | null;
}

const clampHeight = (raw: unknown): number => {
	const n = Number.parseFloat(String(raw ?? ""));
	if (!Number.isFinite(n)) return DEFAULT_HEIGHT;
	return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(n)));
};

/**
 * 배경 값은 그대로 `style.background` 에 들어간다. 사용자가 넣은 문자열이 그 선언을 닫고
 * 다른 선언을 여는 것을 막으려면 `;` 를 지워야 한다(원본 정올 코드도 같은 방어를 한다).
 */
const safeBackground = (raw: string): string => {
	const value = raw.trim().replace(/;/g, "");
	return value || DEFAULT_BACKGROUND;
};

export const CardBlock = Node.create<CardBlockOptions>({
	name: "card",
	group: "block",
	content: "block*",
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			promptBackground: null
		};
	},

	addStorage() {
		return {
			promptBackground: this.options.promptBackground as CardBackgroundPrompt | null
		};
	},

	addAttributes() {
		return {
			title: {
				default: "",
				parseHTML: (el) =>
					el.getAttribute("data-card-title") ?? el.getAttribute("title") ?? "",
				renderHTML: (attrs) =>
					attrs.title ? { "data-card-title": attrs.title as string } : {}
			},
			background: {
				default: "",
				parseHTML: (el) =>
					el.getAttribute("data-card-background") ?? el.getAttribute("background") ?? "",
				renderHTML: (attrs) =>
					attrs.background
						? { "data-card-background": attrs.background as string }
						: {}
			},
			height: {
				default: String(DEFAULT_HEIGHT),
				parseHTML: (el) =>
					el.getAttribute("data-card-height") ?? el.getAttribute("height") ?? String(DEFAULT_HEIGHT),
				renderHTML: (attrs) => ({ "data-card-height": String(attrs.height ?? DEFAULT_HEIGHT) })
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'div[data-type="card"]' },
			// 옛 정올 스키마. `transformLegacyHtml` 이 못 잡고 지나간 것도 여기서 받는다.
			{ tag: "tiptap-card" }
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				"data-type": "card"
			}),
			0
		];
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			let currentNode = node;
			let detachResize: (() => void) | null = null;

			const dom = document.createElement("div");
			dom.setAttribute("data-type", "card");
			dom.setAttribute("data-node-view-wrapper", "");
			dom.className = "hce-card";
			dom.style.position = "relative";

			const frame = document.createElement("section");
			frame.className = "hce-card-frame";
			frame.setAttribute("data-card-frame", "");
			dom.appendChild(frame);

			const content = document.createElement("div");
			content.className = "hce-card-content";
			frame.appendChild(content);

			const header = document.createElement("header");
			header.className = "hce-card-header";
			content.appendChild(header);

			const body = document.createElement("div");
			body.className = "hce-card-body";
			content.appendChild(body);

			/** 편집 모드에서만 만드는 제목 입력칸. 읽기 모드에서는 `<h2>`. */
			let titleInput: HTMLInputElement | null = null;
			let titleHeading: HTMLHeadingElement | null = null;

			const applyAttrs = (n: typeof node) => {
				frame.style.height = `${clampHeight(n.attrs.height)}px`;
				frame.style.background = safeBackground(String(n.attrs.background ?? ""));
				const title = String(n.attrs.title ?? "");
				if (titleInput) {
					if (titleInput.value !== title) titleInput.value = title;
				} else if (titleHeading) {
					titleHeading.textContent = title;
					titleHeading.hidden = !title;
				}
			};

			const setAttr = (patch: Record<string, unknown>) => {
				const pos = getPos();
				if (pos == null) return;
				editor.view.dispatch(
					editor.view.state.tr.setNodeMarkup(pos, undefined, {
						...currentNode.attrs,
						...patch
					})
				);
			};

			if (editor.isEditable) {
				titleInput = document.createElement("input");
				titleInput.type = "text";
				titleInput.className = "hce-card-title-input";
				titleInput.placeholder = "카드 제목";
				titleInput.contentEditable = "false";
				// ProseMirror 가 입력칸의 키/포인터를 가져가지 않도록 막는다.
				titleInput.setAttribute("data-card-control", "");
				titleInput.addEventListener("input", () => {
					setAttr({ title: titleInput?.value ?? "" });
				});
				header.appendChild(titleInput);

				const pick = document.createElement("button");
				pick.type = "button";
				pick.className = "hce-card-bg-button";
				pick.setAttribute("data-card-control", "");
				pick.contentEditable = "false";
				pick.textContent = "배경 변경";
				pick.addEventListener("click", async (e) => {
					e.preventDefault();
					e.stopPropagation();
					// 이 패키지는 `Storage` 타입 증강을 하지 않아 인덱스 접근이 막힌다
					// (`editor.storage.fileAttachment` 도 같은 이유로 이미 에러가 나 있다).
					// 여기서만 unknown 을 거쳐 내려간다 — 새 타입 에러를 만들지 않기 위해서다.
					const storage = editor.storage as unknown as Record<string, unknown>;
					const prompt = (storage.card as { promptBackground?: CardBackgroundPrompt } | undefined)
						?.promptBackground;
					const current = String(currentNode.attrs.background ?? "");
					const next = prompt
						? await prompt(current)
						: window.prompt("카드 배경 (CSS background 값)", current);
					if (next == null) return;
					setAttr({ background: next });
				});
				frame.appendChild(pick);

				detachResize = attachResize({
					dom: frame,
					editor,
					getPos,
					getNode: () => currentNode,
					axis: "y",
					attr: "height",
					min: MIN_HEIGHT,
					max: MAX_HEIGHT,
					label: "카드 높이 조절",
					// 원본과 같은 저장 형식 — 단위 없는 숫자 문자열.
					format: (v) => String(Math.round(v))
				});
			} else {
				titleHeading = document.createElement("h2");
				titleHeading.className = "hce-card-title";
				header.appendChild(titleHeading);
			}

			applyAttrs(node);

			return {
				dom,
				contentDOM: body,
				update: (updated) => {
					if (updated.type.name !== "card") return false;
					currentNode = updated;
					applyAttrs(updated);
					return true;
				},
				// 제목 입력칸·배경 버튼 위의 이벤트는 ProseMirror 가 가로채면 안 된다.
				stopEvent: (event: Event) => {
					const target = event.target;
					return target instanceof Element && !!target.closest("[data-card-control]");
				},
				destroy: () => {
					detachResize?.();
				}
			};
		};
	},

	addCommands() {
		return {
			setCard:
				(attrs?: { title?: string; background?: string; height?: string }) =>
				({ chain }) =>
					chain()
						.insertContent({
							type: this.name,
							attrs: {
								title: attrs?.title ?? "",
								background: attrs?.background ?? "",
								height: attrs?.height ?? String(DEFAULT_HEIGHT)
							},
							content: [{ type: "paragraph" }]
						})
						.run()
		};
	}
});

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		card: {
			setCard: (attrs?: {
				title?: string;
				background?: string;
				height?: string;
			}) => ReturnType;
		};
	}
}
