import { Node, mergeAttributes } from "@tiptap/core";
import { attachResize } from "../utils/resize";
import { getEditorTranslator } from "../i18n";
import {
	mediaRatioCss,
	normalizeMediaAlign,
	normalizeMediaHeight,
	normalizeMediaRatio
} from "../utils/media-size";

export interface MbusVideoOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		mbusVideo: {
			setMbusVideo: (attrs: { src: string; width?: string }) => ReturnType;
		};
	}
}

export const MbusVideo = Node.create<MbusVideoOptions>({
	name: "mbusVideo",
	group: "block",
	atom: true,
	draggable: true,

	addOptions() {
		return { HTMLAttributes: {} };
	},

	/*
	 * 크기·정렬 저장 규칙은 `VideoEmbed` 와 같다 — 정본은 `data-*` 속성, `style` 은
	 * 폭·정렬의 거울. 이름만 `data-mbus-*` 로 다르다(저장 형식이 곧 계약이라 섞지 않는다).
	 */
	addAttributes() {
		return {
			src: { default: null },
			width: { default: null },
			height: { default: null },
			ratio: { default: null },
			align: { default: null }
		};
	},

	parseHTML() {
		return [
			{
				tag: "div[data-mbus-src]",
				getAttrs: (dom) => {
					const el = dom as HTMLElement;
					return {
						src: el.getAttribute("data-mbus-src"),
						width: el.getAttribute("data-mbus-width") || el.style?.width || null,
						height: normalizeMediaHeight(el.getAttribute("data-mbus-height")),
						ratio: normalizeMediaRatio(el.getAttribute("data-mbus-ratio")),
						align: normalizeMediaAlign(el.getAttribute("data-mbus-align"))
					};
				}
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		const attrs: Record<string, string> = {
			"data-mbus-src": HTMLAttributes.src
		};
		const styles: string[] = [];
		if (HTMLAttributes.width) {
			attrs["data-mbus-width"] = HTMLAttributes.width;
			styles.push(`width: ${HTMLAttributes.width}`);
		}
		const height = normalizeMediaHeight(HTMLAttributes.height);
		if (height != null) attrs["data-mbus-height"] = String(height);
		const ratio = normalizeMediaRatio(HTMLAttributes.ratio);
		if (height == null && ratio) attrs["data-mbus-ratio"] = ratio;
		const align = normalizeMediaAlign(HTMLAttributes.align);
		if (align) {
			attrs["data-mbus-align"] = align;
			if (align === "center") styles.push("margin-left: auto", "margin-right: auto");
			else if (align === "right") styles.push("margin-left: auto");
		}
		if (styles.length) attrs["style"] = styles.join("; ");
		return ["div", mergeAttributes(this.options.HTMLAttributes, attrs)];
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			const t = getEditorTranslator(editor);
			// 리사이즈가 attrs 를 되쓰므로 **항상 최신 노드**여야 한다(복붙 시절의 stale 버그).
			let currentNode = node;
			let detachResize: (() => void) | null = null;
			let detachHeightResize: (() => void) | null = null;

			const dom = document.createElement("div");
			dom.setAttribute("data-type", "mbusVideo");
			dom.setAttribute("data-node-view-wrapper", "");
			dom.style.cssText = "margin:8px 0;position:relative;box-sizing:border-box;max-width:100%;";

			/* `padding-top:56.25%` → `aspect-ratio` 로 바꾼 이유는 `VideoEmbed` 주석 참조. */
			const aspect = document.createElement("div");
			aspect.style.cssText =
				"position:relative;width:100%;aspect-ratio:16 / 9;background:#0b1020;border-radius:8px;overflow:hidden;";
			dom.appendChild(aspect);

			const applyLayout = (attrs: Record<string, unknown>) => {
				dom.style.width = typeof attrs.width === "string" && attrs.width ? attrs.width : "";
				const height = normalizeMediaHeight(attrs.height);
				if (height != null) {
					aspect.style.height = `${height}px`;
					aspect.style.removeProperty("aspect-ratio");
				} else {
					aspect.style.removeProperty("height");
					aspect.style.aspectRatio = mediaRatioCss(attrs.ratio) ?? "16 / 9";
				}
				const align = normalizeMediaAlign(attrs.align);
				dom.style.marginLeft = align === "center" || align === "right" ? "auto" : "";
				dom.style.marginRight = align === "center" ? "auto" : "";
			};
			applyLayout(node.attrs);

			if (node.attrs.src) {
				const iframe = document.createElement("iframe");
				iframe.src = node.attrs.src;
				iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
				iframe.setAttribute("allowfullscreen", "");
				iframe.setAttribute("loading", "lazy");
				iframe.style.cssText =
					"position:absolute;inset:0;width:100%;height:100%;border:0;display:block;";
				aspect.appendChild(iframe);
			}

			if (editor.isEditable) {
				const del = document.createElement("button");
				del.type = "button";
				del.textContent = "\u00D7";
				del.style.cssText =
					"position:absolute;top:8px;right:8px;width:28px;height:28px;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:18px;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:2;";
				del.addEventListener("click", () => {
					const pos = typeof getPos === "function" ? getPos() : null;
					if (pos != null) {
						editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
					}
				});
				dom.appendChild(del);

				detachResize = attachResize({
					dom,
					editor,
					getPos: () => (typeof getPos === "function" ? getPos() : undefined),
					getNode: () => currentNode,
					axis: "x",
					label: t("videoResizeWidth")
				});

				/* 높이 드래그 — 크기는 비율 박스, 손잡이는 래퍼(`VideoEmbed` 주석 참조). */
				detachHeightResize = attachResize({
					dom: aspect,
					handleParent: dom,
					editor,
					getPos: () => (typeof getPos === "function" ? getPos() : undefined),
					getNode: () => currentNode,
					axis: "y",
					attr: "height",
					min: 120,
					max: 1600,
					label: t("videoResizeHeight"),
					buildAttrs: (current, value) => ({
						...current.attrs,
						height: String(Math.round(value)),
						ratio: null
					})
				});
			}

			return {
				dom,
				update: (updated) => {
					if (updated.type !== currentNode.type) return false;
					applyLayout(updated.attrs);
					currentNode = updated;
					return true;
				},
				destroy: () => {
					detachResize?.();
					detachHeightResize?.();
				}
			};
		};
	},

	addCommands() {
		return {
			setMbusVideo:
				(attrs) =>
				({ chain }) => {
					return chain().insertContent({ type: this.name, attrs }).run();
				}
		};
	}
});
