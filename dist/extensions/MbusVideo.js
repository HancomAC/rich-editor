import { Node, mergeAttributes } from "@tiptap/core";
import { attachResize } from "../utils/resize";
export const MbusVideo = Node.create({
    name: "mbusVideo",
    group: "block",
    atom: true,
    draggable: true,
    addOptions() {
        return { HTMLAttributes: {} };
    },
    addAttributes() {
        return {
            src: { default: null },
            width: { default: null }
        };
    },
    parseHTML() {
        return [
            {
                tag: "div[data-mbus-src]",
                getAttrs: (dom) => {
                    const el = dom;
                    return {
                        src: el.getAttribute("data-mbus-src"),
                        width: el.getAttribute("data-mbus-width") || el.style?.width || null
                    };
                }
            }
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const attrs = {
            "data-mbus-src": HTMLAttributes.src
        };
        if (HTMLAttributes.width) {
            attrs["data-mbus-width"] = HTMLAttributes.width;
            attrs["style"] = `width: ${HTMLAttributes.width}`;
        }
        return ["div", mergeAttributes(this.options.HTMLAttributes, attrs)];
    },
    addNodeView() {
        return ({ node, editor, getPos }) => {
            // 리사이즈가 attrs 를 되쓰므로 **항상 최신 노드**여야 한다(복붙 시절의 stale 버그).
            let currentNode = node;
            let detachResize = null;
            const dom = document.createElement("div");
            dom.setAttribute("data-type", "mbusVideo");
            dom.setAttribute("data-node-view-wrapper", "");
            dom.style.cssText = "margin:8px 0;position:relative;box-sizing:border-box;max-width:100%;";
            if (node.attrs.width)
                dom.style.width = node.attrs.width;
            const aspect = document.createElement("div");
            aspect.style.cssText =
                "position:relative;width:100%;padding-top:56.25%;background:#0b1020;border-radius:8px;overflow:hidden;";
            dom.appendChild(aspect);
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
                    label: "영상 너비 조절"
                });
            }
            return {
                dom,
                update: (updated) => {
                    if (updated.type !== currentNode.type)
                        return false;
                    const w = updated.attrs.width;
                    dom.style.width = w || "";
                    currentNode = updated;
                    return true;
                },
                destroy: () => {
                    detachResize?.();
                }
            };
        };
    },
    addCommands() {
        return {
            setMbusVideo: (attrs) => ({ chain }) => {
                return chain().insertContent({ type: this.name, attrs }).run();
            }
        };
    }
});
