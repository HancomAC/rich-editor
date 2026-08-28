/**
 * 범용 영상 임베드 — 유튜브·Vimeo, 그리고 그대로 넣을 수 있는 임베드 주소.
 *
 * ⚠️ **`MbusVideo` 와 따로 둔다.** 틀(16:9 iframe)은 똑같지만, mbus 노드는 앱 쪽
 * `MidibusInner.svelte` 가 `play.mbus.tv` 전용 파라미터(`label`·`start`·`volume`)를 붙여
 * 처리한다. 유튜브 주소를 `data-mbus-src` 로 저장하면 그 경로로 흘러 들어가 엉뚱하게
 * 다뤄진다. 저장 형식이 곧 계약이라, 담기는 것이 달라지면 이름도 달라야 한다.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { attachResize } from "../utils/resize";
/** `1m30s` · `90` 처럼 적히는 유튜브 타임스탬프를 초로 바꾼다. */
function parseTimestamp(raw) {
    if (!raw)
        return null;
    if (/^\d+$/.test(raw))
        return Number(raw);
    const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!m || (!m[1] && !m[2] && !m[3]))
        return null;
    return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}
/**
 * 붙여넣은 주소를 **iframe 에 넣을 수 있는 주소**로 바꾼다.
 *
 * ⚠️ 이 변환이 이 확장의 핵심이다. 사람들이 붙여넣는 `youtube.com/watch?v=…` 를 그대로
 * iframe 에 넣으면 유튜브가 `X-Frame-Options` 로 **거부**한다(화면엔 빈 칸만 남는다).
 * `embed/<id>` 로 바꿔야 비로소 실린다. mbus 주소는 그 자체가 플레이어 페이지라 이런
 * 손질이 필요 없었고, 그래서 `MbusVideo` 에는 이런 코드가 아예 없다.
 *
 * 아는 서비스가 아니면 **손대지 않고 그대로 돌려준다** — 이미 임베드 주소를 들고 온
 * 경우(사내 플레이어 등)를 막지 않기 위해서다.
 */
export function toEmbedUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return trimmed;
    let u;
    try {
        u = new URL(trimmed);
    }
    catch {
        return trimmed;
    }
    const host = u.hostname.replace(/^www\./, "");
    // ── 유튜브 ──
    const isYouTube = host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com" ||
        host === "youtube-nocookie.com" ||
        host === "youtu.be";
    if (isYouTube) {
        let id = "";
        if (host === "youtu.be") {
            id = u.pathname.split("/").filter(Boolean)[0] || "";
        }
        else if (u.pathname === "/watch") {
            id = u.searchParams.get("v") || "";
        }
        else {
            // /embed/ID · /shorts/ID · /live/ID · /v/ID
            const parts = u.pathname.split("/").filter(Boolean);
            if (["embed", "shorts", "live", "v"].includes(parts[0]))
                id = parts[1] || "";
        }
        if (!id)
            return trimmed;
        const embed = new URL(`https://www.youtube.com/embed/${id}`);
        const start = parseTimestamp(u.searchParams.get("t") || u.searchParams.get("start"));
        if (start)
            embed.searchParams.set("start", String(start));
        // 재생목록 안의 영상이면 목록을 유지한다.
        const list = u.searchParams.get("list");
        if (list)
            embed.searchParams.set("list", list);
        return embed.toString();
    }
    // ── Vimeo ──
    if (host === "vimeo.com" || host === "player.vimeo.com") {
        if (host === "player.vimeo.com")
            return trimmed; // 이미 플레이어 주소
        // /123456 · /channels/xxx/123456 · /groups/xxx/videos/123456
        const id = u.pathname.split("/").filter(Boolean).filter((p) => /^\d+$/.test(p)).pop();
        if (!id)
            return trimmed;
        return `https://player.vimeo.com/video/${id}`;
    }
    return trimmed;
}
/**
 * 이 브라우저에서 **COEP 없는 남의 iframe** 을 실을 수 있는지.
 *
 * ⚠️ 정올은 전 브라우저에 `COEP: require-corp`(교차 출처 격리)를 건다. 격리된 문서에
 * 자기 COEP 를 안 보내는 제3자 iframe(유튜브·Vimeo·mbus 전부 해당)을 넣는 방법은
 * `credentialless` 속성뿐인데 **크로미움 전용**이다(파이어폭스 미구현·사파리 거부).
 * 그래서 정올 파폭·사파리에서는 mbus 영상이 지금 **빈 회색 박스**로 남아 있다.
 *
 * 격리되지 않은 문서(코드패스의 비-크로미움 등)에서는 평범한 크로스오리진 iframe 이라
 * 아무 문제가 없다 — 그래서 격리 여부와 지원 여부를 **함께** 본다.
 */
function canEmbedCrossOrigin() {
    if (typeof window === "undefined")
        return true;
    if (!window.crossOriginIsolated)
        return true;
    return "credentialless" in HTMLIFrameElement.prototype;
}
export const VideoEmbed = Node.create({
    name: "videoEmbed",
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
                tag: "div[data-video-src]",
                getAttrs: (dom) => {
                    const el = dom;
                    return {
                        src: el.getAttribute("data-video-src"),
                        width: el.getAttribute("data-video-width") || el.style?.width || null
                    };
                }
            }
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const attrs = {
            "data-video-src": HTMLAttributes.src
        };
        if (HTMLAttributes.width) {
            attrs["data-video-width"] = HTMLAttributes.width;
            attrs["style"] = `width: ${HTMLAttributes.width}`;
        }
        return ["div", mergeAttributes(this.options.HTMLAttributes, attrs)];
    },
    addNodeView() {
        return ({ node, editor, getPos }) => {
            // 리사이즈가 attrs 를 되쓰므로 **항상 최신 노드**여야 한다(mbus 의 stale 버그와 같은 자리).
            let currentNode = node;
            let detachResize = null;
            const dom = document.createElement("div");
            dom.setAttribute("data-type", "videoEmbed");
            dom.setAttribute("data-node-view-wrapper", "");
            dom.style.cssText = "margin:8px 0;position:relative;box-sizing:border-box;max-width:100%;";
            if (node.attrs.width)
                dom.style.width = node.attrs.width;
            const aspect = document.createElement("div");
            aspect.style.cssText =
                "position:relative;width:100%;padding-top:56.25%;background:#0b1020;border-radius:8px;overflow:hidden;";
            dom.appendChild(aspect);
            const src = node.attrs.src;
            if (src && canEmbedCrossOrigin()) {
                const iframe = document.createElement("iframe");
                iframe.src = src;
                iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
                iframe.setAttribute("allowfullscreen", "");
                iframe.setAttribute("loading", "lazy");
                /*
                 * 격리된 문서에서 COEP 없는 영상을 싣는 유일한 통로. 크로미움이 아니면 이
                 * 속성 자체가 무시되므로 조건 없이 붙여도 해가 없다.
                 */
                iframe.setAttribute("credentialless", "");
                iframe.style.cssText =
                    "position:absolute;inset:0;width:100%;height:100%;border:0;display:block;";
                aspect.appendChild(iframe);
            }
            else if (src) {
                /*
                 * 실을 수 없는 브라우저 — **빈 박스로 두지 않는다.** 그러면 사용자는 영상이
                 * 깨진 줄 알지 이유를 모른다. 무엇이 있었는지와 나가는 길을 보여 준다.
                 */
                const poster = document.createElement("div");
                poster.style.cssText =
                    "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;color:#c7cbd4;";
                const label = document.createElement("span");
                label.textContent = "이 브라우저에서는 영상을 여기 띄울 수 없습니다";
                label.style.cssText = "font-size:13px;line-height:1.5;";
                poster.appendChild(label);
                const open = document.createElement("a");
                open.href = src;
                open.target = "_blank";
                open.rel = "noopener noreferrer";
                open.textContent = "새 탭에서 보기";
                open.style.cssText =
                    "font-size:13px;font-weight:600;color:#fff;background:rgba(255,255,255,0.16);border-radius:6px;padding:6px 14px;text-decoration:none;";
                poster.appendChild(open);
                aspect.appendChild(poster);
            }
            if (editor.isEditable) {
                const del = document.createElement("button");
                del.type = "button";
                del.textContent = "×";
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
            setVideoEmbed: (attrs) => ({ chain }) => {
                // 넣는 길이 여럿이라(툴바·슬래시·붙여넣기) **여기서 한 번에** 정규화한다.
                return chain()
                    .insertContent({ type: this.name, attrs: { ...attrs, src: toEmbedUrl(attrs.src) } })
                    .run();
            }
        };
    }
});
