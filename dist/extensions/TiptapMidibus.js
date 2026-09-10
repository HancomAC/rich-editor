/**
 * 정올 prod 저장 형식인 `<tiptap-midibus …>` 를 **그대로 읽고 그대로 되쓰는** 노드.
 *
 * ⚠️ **`MbusVideo` 와 다른 노드다.** 둘 다 mbus 영상이지만 저장 형식이 다르다 —
 * `MbusVideo` 는 lms(rich-editor) 가 만든 `div[data-mbus-src]` 이고, 이쪽은 정올 prod
 * 에디터(`@seorii/tiptap`)가 만든 커스텀 태그다. 정올 prod 와 lms 는 **같은 Datastore 를
 * 공유**하므로, 한쪽이 모르는 형식을 만나면 그 블록이 통째로 사라진다. 실제로 lms 에서
 * 강의영상 글을 열면 본문이 `<p>` 하나만 남고 비었다(prod 게시글·댓글 15,479 건 중
 * 181 건이 이 형식이고, 2026 년에도 51 건이 새로 쌓였다 — 사멸한 형식이 아니다).
 *
 * 그래서 이 노드의 계약은 **재생이 아니라 보존**이다:
 * 1. `parseHTML` 이 여는 태그의 속성을 **순서까지 그대로** `rawAttrs` 에 담는다.
 * 2. `renderHTML` 은 `rawAttrs` 가 있으면 그것을 그대로 되뱉는다 → 왕복에서 바이트 보존.
 * 3. 화면에는 **읽기 전용 자리표시자**만 세운다(아래 이유).
 *
 * ⚠️ **재생 UI 는 패키지에 넣지 않는다 — 호스트가 주입한다.** prod 플레이어
 * (`trinity/apps/jungol/src/components/ui/tiptap/midibus/MidibusInner.svelte`)는
 * ① 로그인 계정 id 로 `uuid` 를 조립하고 ② `GET /midibus/start/{id}` 로 이어보기 지점을
 * 받아오며 ③ PIP 헬퍼를 쓴다 — 셋 다 **호스트 앱의 API 클라이언트·세션**이 있어야 하는
 * 것이라 패키지 안으로 들어올 수 없다. 그래서 파일 첨부가 `resolver` 를 받는 것과 같은
 * 방식으로 `renderer` 를 받는다: **노드와 마크업은 여기, 플레이어는 앱.**
 * 주입이 없으면(코드패스 등) 지금까지처럼 자리표시자로 폴백한다.
 *
 * ⚠️ 정올은 전 문서에 `COEP: require-corp` 를 걸어 두어서, `credentialless` 를 모르는
 * 파이어폭스·사파리에서는 **prod 에서도 이 영상이 이미 빈 회색 박스**다. 주입된
 * 플레이어도 그 미해결 문제를 그대로 물려받는다 — 나빠지지는 않지만 낫지도 않다.
 * 자리표시자에는 플레이어 새 탭 링크를 둔다 — 비로그인 prod 가 쓰는 것과 같은 주소다.
 */
import { Node, mergeAttributes } from "@tiptap/core";
/**
 * ⚠️ `on*` 만 걸러내고 나머지는 손대지 않는다. prod 가 `data-resize-*`·`data-bubble-menu`
 * 같은 것을 붙여 저장해도 여기서 살아남아야 왕복이 성립한다 — 아는 속성만 남기면
 * 모르는 속성이 조용히 증발한다.
 */
function readRawAttrs(el) {
    const out = {};
    for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on"))
            continue;
        out[name] = attr.value;
    }
    return out;
}
export const TiptapMidibus = Node.create({
    name: "tiptapMidibus",
    group: "block",
    atom: true,
    draggable: true,
    inline: false,
    addOptions() {
        return {
            HTMLAttributes: {},
            playerBaseUrl: "https://play.mbus.tv/v1/hls",
            renderer: null
        };
    },
    /*
     * 기본값은 **prod 와 한 글자도 다르면 안 된다**(prod `midibus/index.ts`).
     * 여기서 새로 넣은 영상이 prod 에디터로 넘어가도 같은 꼴로 보여야 하기 때문이다.
     */
    addAttributes() {
        return {
            id: { default: "" },
            start: { default: 0 },
            uuid: { default: "" },
            width: { default: "100%" },
            height: { default: "600" },
            /*
             * 저장본을 되쓸 때 쓰는 원본 속성. `rendered: false` 라 위 다섯 개와 겹쳐
             * 두 번 나가지 않는다.
             */
            rawAttrs: {
                default: null,
                rendered: false,
                parseHTML: (element) => readRawAttrs(element)
            }
        };
    },
    parseHTML() {
        return [{ tag: "tiptap-midibus" }];
    },
    renderHTML({ node, HTMLAttributes }) {
        const raw = node.attrs.rawAttrs;
        /*
         * 읽어 들인 글이면 **원본 그대로**. 속성을 다시 조립하면 순서가 바뀌거나
         * 모르는 속성이 빠져 prod 저장본과 달라진다.
         */
        if (raw)
            return ["tiptap-midibus", { ...raw }];
        // 여기서 새로 넣은 영상. prod `renderHTML` 과 같은 꼴로 만든다.
        return [
            "tiptap-midibus",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                "data-bubble-menu": "false"
            })
        ];
    },
    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement("div");
            dom.setAttribute("data-type", "tiptapMidibus");
            dom.setAttribute("data-node-view-wrapper", "");
            dom.style.cssText = "margin:8px 0;position:relative;box-sizing:border-box;max-width:100%;";
            const renderer = this.options.renderer;
            if (renderer) {
                let cleanup = false;
                try {
                    cleanup = renderer({ element: dom, node, editor });
                }
                catch {
                    /* 호스트 플레이어가 터져도 노드까지 잃지는 않는다 — 자리표시자로 되돌아간다. */
                    cleanup = false;
                }
                if (cleanup !== false) {
                    return {
                        dom,
                        /*
                         * 속성이 바뀌면 노드뷰를 **새로 만들게 둔다**(`false`). 호스트가 어떤
                         * 틀로 그렸는지 여기서는 모르므로 갈아 끼울 방법이 없다.
                         */
                        update: () => false,
                        /*
                         * 호스트가 그린 DOM 은 **문서가 아니다.** 재생 중 iframe·버튼이
                         * 바뀌는 것을 파서가 되읽으면 노드 속성이 오염된다.
                         */
                        ignoreMutation: () => true,
                        destroy: () => {
                            if (typeof cleanup === "function")
                                cleanup();
                        }
                    };
                }
                /* 사양했다. 호스트가 뭔가 그리다 말았을 수 있으니 비우고 자리표시자로 간다. */
                dom.replaceChildren();
            }
            const videoId = String(node.attrs.id ?? "").trim();
            const startRaw = Number(node.attrs.start ?? 0);
            const start = Number.isFinite(startRaw) ? Math.max(0, Math.floor(startRaw)) : 0;
            const aspect = document.createElement("div");
            aspect.style.cssText =
                "position:relative;width:100%;padding-top:56.25%;background:#0b1020;border-radius:8px;overflow:hidden;";
            dom.appendChild(aspect);
            const poster = document.createElement("div");
            poster.style.cssText =
                "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;color:#c7cbd4;";
            aspect.appendChild(poster);
            const label = document.createElement("span");
            label.textContent = "강의 영상";
            label.style.cssText = "font-size:13px;font-weight:600;line-height:1.5;";
            poster.appendChild(label);
            const hint = document.createElement("span");
            hint.textContent = videoId ? videoId : "영상 주소가 비어 있습니다";
            hint.style.cssText = "font-size:12px;line-height:1.5;opacity:0.7;word-break:break-all;";
            poster.appendChild(hint);
            if (videoId) {
                const open = document.createElement("a");
                open.href = `${this.options.playerBaseUrl}/${videoId}?start=${start}&volume=50`;
                open.target = "_blank";
                open.rel = "noopener noreferrer";
                open.textContent = "새 탭에서 보기";
                open.style.cssText =
                    "font-size:13px;font-weight:600;color:#fff;background:rgba(255,255,255,0.16);border-radius:6px;padding:6px 14px;text-decoration:none;";
                poster.appendChild(open);
            }
            return { dom };
        };
    },
    addCommands() {
        return {
            setTiptapMidibus: (attrs) => ({ chain }) => {
                return chain().insertContent({ type: this.name, attrs }).run();
            }
        };
    }
});
