/**
 * 정올 prod 에만 있는 옛 블록 셋을 **원본 마크업 그대로 품는** 보존용 노드.
 *
 * - `<lite-youtube videoid=…>` — 유튜브 파사드 커스텀 엘리먼트 (prod 1 건)
 * - `<div class="iframe-wrapper"><iframe …></div>` — 옛 임베드 (prod 69 건, 사멸 추세)
 * - `<div class="tiptap-columns"><div class="tiptap-column">…</div></div>` — 옛 단 (prod 1 건)
 *
 * ⚠️ **왜 편집 가능한 노드로 바꾸지 않는가.** 정올 prod 와 lms 는 같은 Datastore 를
 * 공유한다. 옛 단을 `Columns`(`div[data-type="columns"]`) 로 바꿔 저장하면 lms 에서는
 * 잘 보이지만 **이번엔 prod 에디터가 그 형식을 모른다** — 손해를 반대로 옮길 뿐이다.
 * 그래서 이 노드는 읽은 그대로 되쓴다: `parseHTML` 이 DOM 을 그대로 옮긴 명세(spec)로
 * 뜨고, `renderHTML` 이 그 명세를 되돌려준다. 편집은 못 하지만 **아무것도 잃지 않는다.**
 *
 * ⚠️ **셀렉터 우선순위.** `Columns`/`Column` 에 이미 `div.tiptap-columns`·`div.tiptap-column`
 * 규칙이 있다(기본 우선순위 50). 여기 규칙에 100 을 줘서 먼저 잡히게 한다. 그리고
 * `transformLegacyHtml` 이 `class="tiptap-columns"` 를 `data-type="columns"` 로 미리
 * 바꿔 버리면 여기까지 오지도 못하므로, 그 치환은 함께 제거했다(`utils/sanitize.ts`).
 *
 * ⚠️ **바이트 보존의 한계 하나.** `editor.getHTML()` 은 결국 DOM 을 거쳐 직렬화되므로
 * 값 없는 속성(`allowfullscreen`)은 `allowfullscreen=""` 로 정규화된다. prod 저장본도
 * 같은 경로(`getHTML()`)로 만들어져 이미 `=""` 꼴이라 실사용에서는 어긋나지 않는다.
 */
import { Node } from "@tiptap/core";
/** 되쓸 이유가 없는(그리고 되쓰면 위험한) 것들. prod 저장본에는 원래 들어 있지 않다. */
const SKIP_TAGS = new Set(["script", "style", "noscript", "template"]);
/** `Columns`/`Column` 의 같은 셀렉터보다 먼저 잡혀야 한다(기본 50). */
const LEGACY_PARSE_PRIORITY = 100;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
/**
 * DOM 요소를 저장 가능한 명세로 옮긴다. 속성은 **적힌 순서 그대로**, 자식은 텍스트까지
 * 그대로 옮긴다. `on*` 만 떨어뜨린다 — 그것까지 되쓰면 보존이 아니라 XSS 통로가 된다.
 */
export function elementToSpec(el) {
    const attrs = {};
    for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on"))
            continue;
        attrs[name] = attr.value;
    }
    const children = [];
    for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === TEXT_NODE) {
            const text = child.nodeValue ?? "";
            if (text)
                children.push(text);
        }
        else if (child.nodeType === ELEMENT_NODE) {
            const childEl = child;
            if (SKIP_TAGS.has(childEl.tagName.toLowerCase()))
                continue;
            children.push(elementToSpec(childEl));
        }
    }
    return [el.tagName.toLowerCase(), attrs, ...children];
}
/**
 * ⚠️ **깊은 복사가 필수다.** ProseMirror 1.25 는 `renderSpec` 에서 "노드 attrs 안에 있는
 * 배열이 그대로 DOM 명세로 넘어왔는지" 를 검사해 XSS 로 보고 던진다
 * (`Using an array from an attribute object as a DOM spec`). 검사는 attrs 를 훑어 **닿는
 * 모든 배열**을 모으므로 얕은 복사로는 자식에서 그대로 걸린다.
 */
function cloneSpec(spec) {
    if (typeof spec === "string")
        return spec;
    const [tag, attrs, ...children] = spec;
    return [tag, { ...attrs }, ...children.map(cloneSpec)];
}
/** 자리표시자에 보여 줄 미리보기 글자. */
function specText(spec) {
    if (typeof spec === "string")
        return spec;
    const [, , ...children] = spec;
    return children.map(specText).join("");
}
/** 명세 트리에서 첫 번째 `tag` 요소를 찾는다(임베드 주소를 꺼내려고). */
function findSpec(spec, tag) {
    if (typeof spec === "string")
        return null;
    if (spec[0] === tag)
        return spec;
    const [, , ...children] = spec;
    for (const child of children) {
        const found = findSpec(child, tag);
        if (found)
            return found;
    }
    return null;
}
function detectKind(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "lite-youtube")
        return "youtube";
    if (el.classList?.contains("tiptap-columns"))
        return "columns";
    return "iframe";
}
const KIND_LABEL = {
    youtube: "유튜브 영상",
    iframe: "임베드",
    columns: "단 나누기"
};
/** 자리표시자의 "새 탭에서 보기" 주소. 없으면 링크를 안 만든다. */
function outboundUrl(kind, spec) {
    if (!spec)
        return null;
    if (kind === "youtube") {
        const videoId = spec[1]?.videoid;
        return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : null;
    }
    if (kind === "iframe") {
        const frame = findSpec(spec, "iframe");
        const src = frame?.[1]?.src ?? "";
        return /^https?:\/\//i.test(src) ? src : null;
    }
    return null;
}
export const LegacyBlock = Node.create({
    name: "legacyBlock",
    group: "block",
    atom: true,
    selectable: true,
    draggable: false,
    addAttributes() {
        return {
            /* 원본 마크업. `rendered: false` — `renderHTML` 이 직접 되뱉는다. */
            spec: {
                default: null,
                rendered: false,
                parseHTML: (element) => elementToSpec(element)
            },
            kind: {
                default: "iframe",
                rendered: false,
                parseHTML: (element) => detectKind(element)
            }
        };
    },
    parseHTML() {
        return [
            { tag: "lite-youtube", priority: LEGACY_PARSE_PRIORITY },
            { tag: "div.iframe-wrapper", priority: LEGACY_PARSE_PRIORITY },
            { tag: "div.tiptap-columns", priority: LEGACY_PARSE_PRIORITY }
        ];
    },
    renderHTML({ node }) {
        const spec = node.attrs.spec;
        // 명세가 없는 노드는 만들 길이 없지만(삽입 명령이 없다), 스키마상 방어해 둔다.
        if (!spec)
            return ["div", {}];
        return cloneSpec(spec);
    },
    addNodeView() {
        return ({ node }) => {
            const kind = (node.attrs.kind ?? "iframe");
            const spec = node.attrs.spec;
            const dom = document.createElement("div");
            dom.setAttribute("data-type", "legacyBlock");
            dom.setAttribute("data-legacy-kind", kind);
            dom.setAttribute("data-node-view-wrapper", "");
            dom.style.cssText =
                "margin:8px 0;padding:16px;border:1px dashed rgba(120,130,150,0.5);border-radius:8px;background:rgba(120,130,150,0.06);box-sizing:border-box;max-width:100%;display:flex;flex-direction:column;gap:6px;align-items:flex-start;";
            const label = document.createElement("span");
            label.textContent = `${KIND_LABEL[kind]} (옛 형식 · 편집 불가)`;
            label.style.cssText = "font-size:13px;font-weight:600;opacity:0.8;";
            dom.appendChild(label);
            /*
             * 저장된 내용을 **글자로만** 보여 준다. 옛 단은 본문이 통째로 들어 있어서,
             * 이걸 안 보여 주면 작성자는 무엇이 들었는지 모른 채 지우게 된다.
             */
            const preview = spec ? specText(spec).replace(/\s+/g, " ").trim() : "";
            if (preview) {
                const body = document.createElement("span");
                body.textContent = preview.length > 200 ? `${preview.slice(0, 200)}…` : preview;
                body.style.cssText = "font-size:13px;line-height:1.6;opacity:0.75;";
                dom.appendChild(body);
            }
            const url = outboundUrl(kind, spec);
            if (url) {
                const open = document.createElement("a");
                open.href = url;
                open.target = "_blank";
                open.rel = "noopener noreferrer";
                open.textContent = "새 탭에서 보기";
                open.style.cssText = "font-size:13px;font-weight:600;text-decoration:underline;";
                dom.appendChild(open);
            }
            return { dom };
        };
    }
});
