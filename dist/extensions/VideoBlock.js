import { Node, mergeAttributes } from "@tiptap/core";
export const VideoBlock = Node.create({
    name: "videoBlock",
    group: "block",
    atom: true,
    draggable: true,
    addOptions() {
        return { HTMLAttributes: {} };
    },
    addAttributes() {
        return {
            src: { default: null },
            name: { default: "" },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'div[data-video-src]',
                getAttrs: (dom) => {
                    const el = dom;
                    return {
                        src: el.getAttribute("data-video-src"),
                        name: el.getAttribute("data-video-name") || "",
                    };
                },
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(this.options.HTMLAttributes, {
                "data-video-src": HTMLAttributes.src,
                "data-video-name": HTMLAttributes.name || "",
            }),
        ];
    },
    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement("div");
            dom.style.cssText = "margin:8px 0;position:relative;";
            const video = document.createElement("video");
            video.src = node.attrs.src;
            video.controls = true;
            video.preload = "metadata";
            video.style.cssText =
                "width:100%;max-height:480px;border-radius:8px;background:#0b1020;";
            video.setAttribute("controlslist", "nodownload");
            video.setAttribute("playsinline", "");
            dom.appendChild(video);
            if (node.attrs.name) {
                const label = document.createElement("p");
                label.textContent = node.attrs.name;
                label.style.cssText =
                    "margin:4px 0 0;font-size:12px;color:var(--muted-foreground, #718096);";
                dom.appendChild(label);
            }
            if (editor.isEditable) {
                const del = document.createElement("button");
                del.type = "button";
                del.textContent = "\u00D7";
                del.style.cssText =
                    "position:absolute;top:8px;right:8px;width:28px;height:28px;border:none;background:rgba(0,0,0,0.6);color:#fff;font-size:18px;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:2;";
                del.addEventListener("mouseenter", () => {
                    del.style.background = "var(--destructive, #FF6B6B)";
                });
                del.addEventListener("mouseleave", () => {
                    del.style.background = "rgba(0,0,0,0.6)";
                });
                del.addEventListener("click", () => {
                    const pos = editor.view.posAtDOM(dom, 0);
                    editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
                });
                dom.appendChild(del);
            }
            return { dom };
        };
    },
    addCommands() {
        return {
            setVideoBlock: (attrs) => ({ chain }) => {
                return chain().insertContent({ type: this.name, attrs }).run();
            },
        };
    },
});
