import { Node, mergeAttributes } from "@tiptap/core";
import { attachResize } from "../utils/resize";
import { applyCrossOriginEmbedAttrs, canEmbedCrossOrigin } from "../utils/embed";
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

			/*
			 * ⚠️ **`credentialless` 를 반드시 붙인다** — `VideoEmbed` 와 같은 이유·같은
			 * 레시피다(`utils/embed.ts`). 정올은 전 문서가 `COEP: require-corp` 라, 이
			 * 속성이 없으면 mbus iframe 이 **크롬에서도 통째로 막히고** 그 자리에 크롬의
			 * 오류 화면(`play.mbus.tv 에서 연결을 거부했습니다`)이 뜬다.
			 *
			 * 이 노드만 그 처리가 빠져 있었다. 저장한 뒤 읽는 화면은 호스트의 정적 렌더
			 * (`trinity …/tiptap/static-enhance.ts` 의 `buildVideoBox`)가 같은 상자를 다시
			 * 지으면서 속성을 붙이므로 **에디터에서만** 거부로 보였다 — "영상을 올리면
			 * 연결이 거부된다"는 신고의 실체가 이 비대칭이다.
			 * (브라우저 실측, 격리된 문서: 속성 없는 mbus iframe = COEP 위반 보고 1건,
			 *  속성 있는 쪽 = 0건.)
			 */
			if (node.attrs.src && canEmbedCrossOrigin()) {
				const iframe = document.createElement("iframe");
				iframe.src = node.attrs.src;
				iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
				iframe.setAttribute("allowfullscreen", "");
				iframe.setAttribute("loading", "lazy");
				applyCrossOriginEmbedAttrs(iframe);
				iframe.style.cssText =
					"position:absolute;inset:0;width:100%;height:100%;border:0;display:block;";
				aspect.appendChild(iframe);
			} else if (node.attrs.src) {
				/*
				 * 실을 수 없는 브라우저(파폭·사파리 + 격리) — **빈 박스로 두지 않는다.**
				 * 그러면 영상이 깨진 줄 알지 이유를 모른다. `VideoEmbed`·호스트 정적 렌더와
				 * **같은 문구·같은 모양**의 포스터를 세운다.
				 */
				const poster = document.createElement("div");
				poster.style.cssText =
					"position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;color:#c7cbd4;";

				const label = document.createElement("span");
				label.textContent = t("videoCannotEmbed");
				label.style.cssText = "font-size:13px;line-height:1.5;";
				poster.appendChild(label);

				const open = document.createElement("a");
				open.href = node.attrs.src;
				open.target = "_blank";
				open.rel = "noopener noreferrer";
				open.textContent = t("openInNewTab");
				open.style.cssText =
					"font-size:13px;font-weight:600;color:#fff;background:rgba(255,255,255,0.16);border-radius:6px;padding:6px 14px;text-decoration:none;";
				poster.appendChild(open);

				aspect.appendChild(poster);
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
