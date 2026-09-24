/**
 * 범용 영상 임베드 — 유튜브·Vimeo, 그리고 그대로 넣을 수 있는 임베드 주소.
 *
 * ⚠️ **`MbusVideo` 와 따로 둔다.** 틀(16:9 iframe)은 똑같지만, mbus 노드는 앱 쪽
 * `MidibusInner.svelte` 가 `play.mbus.tv` 전용 파라미터(`label`·`start`·`volume`)를 붙여
 * 처리한다. 유튜브 주소를 `data-mbus-src` 로 저장하면 그 경로로 흘러 들어가 엉뚱하게
 * 다뤄진다. 저장 형식이 곧 계약이라, 담기는 것이 달라지면 이름도 달라야 한다.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { attachResize } from "../utils/resize";
import { getEditorTranslator } from "../i18n";
import { mediaRatioCss, normalizeMediaAlign, normalizeMediaHeight, normalizeMediaRatio } from "../utils/media-size";
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
 * 저장된 `data-video-src` 를 iframe `src` 로 쓰기 전의 마지막 관문 — http(s) 만 통과한다.
 *
 * 살균기(`sanitize.ts`)의 URL 검사는 `href`·`src` 속성만 보므로 `data-video-src` 에
 * `javascript:` 가 실려 있으면 그대로 통과해 편집 모드 iframe 까지 닿는다. 새로 만드는
 * 경로(붙여넣기·명령)는 전부 임베드 변환기를 거쳐 안전하지만, **저장본은 출처를 믿을 수
 * 없다** — 읽는 쪽에서 거른다.
 */
function safeVideoSrc(raw) {
    if (typeof raw !== "string")
        return null;
    const trimmed = raw.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
/**
 * 유튜브 주소면 임베드 주소를, 아니면 null 을 돌려준다.
 *
 * `toEmbedUrl` 의 유튜브 갈래를 떼어 낸 것 — 붙여넣기 자동 임베드(아래
 * `addProseMirrorPlugins`)가 **유튜브 판별기로도** 써야 해서다. "변환 결과가 달라졌는가"
 * 로 어림하면 이미 임베드 꼴인 주소(`youtube.com/embed/ID`)를 놓친다.
 */
export function youTubeEmbedUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    let u;
    try {
        u = new URL(trimmed);
    }
    catch {
        return null;
    }
    const host = u.hostname.replace(/^www\./, "");
    const isYouTube = host === "youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com" ||
        host === "youtube-nocookie.com" ||
        host === "youtu.be";
    if (!isYouTube)
        return null;
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
        return null;
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
    // ── 유튜브 ──
    const youtube = youTubeEmbedUrl(trimmed);
    if (youtube)
        return youtube;
    let u;
    try {
        u = new URL(trimmed);
    }
    catch {
        return trimmed;
    }
    const host = u.hostname.replace(/^www\./, "");
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
    /*
     * 크기·정렬은 전부 **`data-*` 속성**으로 저장한다(사고 이력: `style` 로 저장하면
     * 살균·정적 렌더에서 지워져 크기가 튄다). `style` 은 폭·정렬을 **거울처럼 한 벌 더**
     * 적을 뿐이고, 읽을 때의 정본은 언제나 `data-*` 쪽이다.
     * 높이·비율은 배타다 — 높이가 있으면 고정 px, 없고 비율이 있으면 비율 박스,
     * 둘 다 없으면 기본 16:9. (main `buildResizeAttrs` 의 규칙 재작성.)
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
                tag: "div[data-video-src]",
                getAttrs: (dom) => {
                    const el = dom;
                    const src = safeVideoSrc(el.getAttribute("data-video-src"));
                    // 스킴이 수상한 저장본은 영상 노드로 받지 않는다 — 빈 껍데기를 남기느니 버린다.
                    if (!src)
                        return false;
                    return {
                        src,
                        width: el.getAttribute("data-video-width") || el.style?.width || null,
                        height: normalizeMediaHeight(el.getAttribute("data-video-height")),
                        ratio: normalizeMediaRatio(el.getAttribute("data-video-ratio")),
                        align: normalizeMediaAlign(el.getAttribute("data-video-align"))
                    };
                }
            }
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const attrs = {
            "data-video-src": HTMLAttributes.src
        };
        const styles = [];
        if (HTMLAttributes.width) {
            attrs["data-video-width"] = HTMLAttributes.width;
            styles.push(`width: ${HTMLAttributes.width}`);
        }
        const height = normalizeMediaHeight(HTMLAttributes.height);
        if (height != null)
            attrs["data-video-height"] = String(height);
        const ratio = normalizeMediaRatio(HTMLAttributes.ratio);
        if (height == null && ratio)
            attrs["data-video-ratio"] = ratio;
        const align = normalizeMediaAlign(HTMLAttributes.align);
        if (align) {
            attrs["data-video-align"] = align;
            if (align === "center")
                styles.push("margin-left: auto", "margin-right: auto");
            else if (align === "right")
                styles.push("margin-left: auto");
        }
        if (styles.length)
            attrs["style"] = styles.join("; ");
        return ["div", mergeAttributes(this.options.HTMLAttributes, attrs)];
    },
    addNodeView() {
        return ({ node, editor, getPos }) => {
            const t = getEditorTranslator(editor);
            // 리사이즈가 attrs 를 되쓰므로 **항상 최신 노드**여야 한다(mbus 의 stale 버그와 같은 자리).
            let currentNode = node;
            let detachResize = null;
            let detachHeightResize = null;
            const dom = document.createElement("div");
            dom.setAttribute("data-type", "videoEmbed");
            dom.setAttribute("data-node-view-wrapper", "");
            dom.style.cssText = "margin:8px 0;position:relative;box-sizing:border-box;max-width:100%;";
            /*
             * 비율 박스. 예전의 `padding-top:56.25%` 대신 CSS `aspect-ratio` 를 쓴다 —
             * `height` 가 지정되면 `aspect-ratio` 는 저절로 비켜서므로(auto 축이 없어진다)
             * 높이 드래그가 인라인 `height` 하나로 그대로 먹는다. padding 방식은 높이를
             * 얹으면 패딩 위에 **더해져** 박스가 두 배로 자란다.
             */
            const aspect = document.createElement("div");
            aspect.style.cssText =
                "position:relative;width:100%;aspect-ratio:16 / 9;background:#0b1020;border-radius:8px;overflow:hidden;";
            dom.appendChild(aspect);
            const applyLayout = (attrs) => {
                dom.style.width = typeof attrs.width === "string" && attrs.width ? attrs.width : "";
                const height = normalizeMediaHeight(attrs.height);
                if (height != null) {
                    aspect.style.height = `${height}px`;
                    aspect.style.removeProperty("aspect-ratio");
                }
                else {
                    aspect.style.removeProperty("height");
                    aspect.style.aspectRatio = mediaRatioCss(attrs.ratio) ?? "16 / 9";
                }
                const align = normalizeMediaAlign(attrs.align);
                dom.style.marginLeft = align === "center" || align === "right" ? "auto" : "";
                dom.style.marginRight = align === "center" ? "auto" : "";
            };
            applyLayout(node.attrs);
            // parseHTML 을 안 거친 경로(JSON 삽입·명령 오용)까지 막는 이중 관문.
            const src = safeVideoSrc(node.attrs.src);
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
                label.textContent = t("videoCannotEmbed");
                label.style.cssText = "font-size:13px;line-height:1.5;";
                poster.appendChild(label);
                const open = document.createElement("a");
                open.href = src;
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
                    label: t("videoResizeWidth")
                });
                /*
                 * 높이 드래그. 크기는 비율 박스가 먹고(고정 px 저장), 손잡이는 래퍼에
                 * 산다 — 박스가 `overflow:hidden` 이라 밖 12px 손잡이가 잘리기 때문.
                 * 수동 드래그는 비율 프리셋을 푼다(main 과 같은 규칙).
                 */
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
                    if (updated.type !== currentNode.type)
                        return false;
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
    addProseMirrorPlugins() {
        return [
            /*
             * 빈 문단에 유튜브 주소를 붙여넣으면 **즉시 임베드로** 바꾼다. 플레인 텍스트와
             * 링크 마크(href) 둘 다 받는다. (main 정올 `plugin/youtube.ts` 의
             * `handlePasteVideoURL` 참조 — 로직 재작성.)
             *
             * ⚠️ **유튜브만** 자동 변환한다. 아무 주소나 임베드로 바꾸면 일반 링크
             * 붙여넣기가 전부 잡아먹히고, 모르는 주소는 iframe 에서 빈 칸이 된다
             * (`toEmbedUrl` 주석). 다른 서비스는 지금처럼 툴바·슬래시로 넣는다.
             */
            new Plugin({
                key: new PluginKey("videoEmbedPaste"),
                props: {
                    handlePaste: (view, _event, slice) => {
                        if (!this.editor.isEditable)
                            return false;
                        if (slice.content.childCount !== 1)
                            return false;
                        const { selection } = view.state;
                        if (!selection.empty)
                            return false;
                        /* 빈 문단에서만 — 글 쓰던 자리·코드블록에는 끼어들지 않는다. */
                        const $head = selection.$head;
                        const parent = $head.node();
                        if (parent.type.name !== "paragraph" || parent.content.size > 0)
                            return false;
                        let embed = youTubeEmbedUrl(slice.content.child(0).textContent);
                        /* 플레인 텍스트가 아니면 링크 마크의 href 도 본다. */
                        if (!embed) {
                            slice.content.descendants((node) => {
                                if (embed)
                                    return false;
                                for (const mark of node.marks) {
                                    const href = mark.attrs.href;
                                    if (!href)
                                        continue;
                                    const fromHref = youTubeEmbedUrl(href);
                                    if (fromHref) {
                                        embed = fromHref;
                                        return false;
                                    }
                                }
                                return true;
                            });
                        }
                        if (!embed)
                            return false;
                        /* 빈 문단은 그대로 두고 그 앞에 심는다 — 커서가 이어서 쓸 자리로 남는다. */
                        this.editor
                            .chain()
                            .insertContentAt($head.before(), {
                            type: this.name,
                            attrs: { src: embed }
                        })
                            .run();
                        return true;
                    }
                }
            })
        ];
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
