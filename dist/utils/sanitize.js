import { escapeHtml } from "./escape-html";
const ALLOWED_TAGS = new Set([
    "p", "br", "b", "i", "u", "em", "strong", "a",
    "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "code", "img", "figure", "figcaption",
    "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
    "span", "div", "hr", "sub", "sup",
    /*
     * ⚠️ **토글(접기)이 여기 빠져 있었다.** 저장본에서 토글은 네이티브
     * `<details><summary>제목</summary><div>본문</div></details>` 로 내려가는데, 두 태그가
     * 허용 목록에 없어서 살균을 거치면 **토글이 통째로 지워졌다.** 정올은 문항 목록에서
     * 저장 HTML 을 `{@html}` 로 먼저 그리면서 이 함수를 태우므로(그쪽 `TipTap.svelte` 주석),
     * 토글이 든 문항은 정적 렌더에서 내용이 사라졌다가 에디터가 서면 되돌아오는 상태였다.
     */
    "details", "summary",
    "tiptap-midibus",
    "math-inline", "math-display",
    /*
     * ⚠️ **정올 prod 전용 옛 블록**(`LegacyBlock` 이 원본 그대로 품는 것들). 에디터는
     * 저장 형식을 보존하는데 살균이 태그를 지워 버리면 정적 렌더(`{@html}` + 살균)에서만
     * 조용히 사라져 "에디터엔 보이는데 목록엔 없다" 가 된다.
     * 감싸는 `div.iframe-wrapper`·`div.tiptap-columns` 는 `div` 라 이미 통과한다
     * (`class` 는 `*` 로 전역 허용).
     */
    "iframe",
    "lite-youtube",
]);
/**
 * `iframe` 을 허용하는 이상 **아무 곳이나 실리게 두지 않는다.** 정올 prod 도 같은 자리에
 * `allowedIframeHostnames: ['jungol.co.kr']` 를 두고 있다(그쪽 `TipTap.svelte`).
 * 여기 없는 호스트는 `src` 만 떨어져 빈 프레임이 된다 — 태그째 지우면 본문 구조가
 * 어긋나므로 값만 뺀다.
 */
const ALLOWED_IFRAME_HOSTS = new Set([
    "jungol.co.kr",
    "www.jungol.co.kr",
    "codepass.co.kr",
    "www.codepass.co.kr",
    "play.mbus.tv",
    "youtube.com",
    "www.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
]);
function isAllowedIframeSrc(value) {
    try {
        // 상대 경로(`/foo`)는 정올 자신을 가리키므로 통과시킨다.
        const url = new URL(value, "https://jungol.co.kr");
        if (url.protocol !== "https:" && url.protocol !== "http:")
            return false;
        return ALLOWED_IFRAME_HOSTS.has(url.hostname.toLowerCase());
    }
    catch {
        return false;
    }
}
const ALLOWED_ATTRS = {
    a: new Set(["href", "title", "target", "rel"]),
    // `data-align` 은 미디어 툴바의 좌/중/우 정렬(`ResizableImage`). `style` 로 저장하면
    // 여기서 지워져 왕복이 어긋나므로 속성으로 저장하고, 그 이름을 여기 허용한다.
    img: new Set(["src", "alt", "width", "height", "data-align"]),
    // 순서목록 마커(`OrderedListMarker`). `type` 은 마커 종류(1·a·A·i·I·kors·korc),
    // `start` 는 시작 번호 — 지워지면 `c.` 로 시작한 목록이 `a.` 부터 다시 세는 것처럼 보인다.
    ol: new Set(["start", "type"]),
    table: new Set(["style"]),
    col: new Set(["style", "width"]),
    td: new Set(["colspan", "rowspan", "colwidth", "style"]),
    th: new Set(["colspan", "rowspan", "colwidth", "style"]),
    // ⚠️ 에디터가 실제로 뱉는 `div` 속성을 전부 적는다. 여기 빠진 것은 조용히 지워져
    //    블록이 평범한 빈 `div` 로 내려앉는다 — 파일·영상·단·카드가 그렇게 사라진다.
    //    (`data-pdf-*` 만 있던 시절엔 나머지가 전부 누락돼 있었다. `sanitizeHtml` 이
    //     아직 아무 데서도 호출되지 않아 드러나지 않았을 뿐이다.)
    div: new Set([
        "data-type",
        "data-pdf-src",
        "data-pdf-name",
        "data-pdf-id",
        "data-pdf-width",
        "data-file-id",
        "data-file-src",
        "data-file-name",
        "data-file-size",
        "data-mbus-src",
        "data-mbus-width",
        // 미디어 툴바·높이 드래그가 저장하는 크기·정렬(`MbusVideo`).
        "data-mbus-height",
        "data-mbus-ratio",
        "data-mbus-align",
        // 유튜브·Vimeo 등 바깥 영상(`VideoEmbed`). mbus 와 **다른 이름**을 쓴다.
        "data-video-src",
        "data-video-width",
        "data-video-height",
        "data-video-ratio",
        "data-video-align",
        "data-card-title",
        "data-card-background",
        "data-card-height",
        // 탭 블록의 탭 이름. 빠지면 살균 때 제목만 조용히 사라져 전부 `탭 1`·`탭 2` 로 되돌아간다.
        "data-tab-title",
        "style",
    ]),
    // 토글은 열린 채 저장될 수 있고(`persist`), 제목 단계는 `data-level` 로 들어간다.
    details: new Set(["open", "data-type"]),
    summary: new Set(["data-level"]),
    pre: new Set(["class"]),
    code: new Set(["class"]),
    /*
     * 정올 prod 강의영상. 다섯 값 뒤에 붙는 것들은 prod `renderHTML` 이 실제로 쓰거나
     * (`data-bubble-menu`) prod 살균이 명시적으로 허용하는 목록 그대로다 — 여기서 빠지면
     * 저장본을 정적으로 그릴 때만 속성이 달아나 왕복이 어긋나 보인다.
     */
    "tiptap-midibus": new Set([
        "id",
        "start",
        "uuid",
        "width",
        "height",
        "data-bubble-menu",
        "data-hide-bubble-menu",
        "data-resize-handler",
        "data-resize-target",
        "data-resize-min-height",
        "data-resize-max-height",
        "data-resize-aspect-ratio",
        "data-resize-horizontal-align",
    ]),
    // 옛 임베드(`div.iframe-wrapper > iframe`). `src` 는 아래 호스트 허용 목록도 함께 탄다.
    iframe: new Set([
        "src",
        "width",
        "height",
        "frameborder",
        "allow",
        "allowfullscreen",
        "loading",
        "title",
        "credentialless",
        "style",
    ]),
    // 옛 유튜브 파사드. prod 살균이 허용하는 다섯 개와 같다.
    "lite-youtube": new Set(["videoid", "params", "nocookie", "title", "provider"]),
    "*": new Set(["class", "id"]),
};
const SAFE_URL_PATTERN = /^(?:https?:\/\/|\/[\w])/i;
export function sanitizeHtml(html) {
    return String(html || "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        /*
         * ⚠️ 태그 이름에 **하이픈이 들어간다**(`[a-zA-Z0-9-]`). 예전 패턴은 `[a-zA-Z0-9]*` 라
         * `<tiptap-midibus>` 에서 `tiptap` 까지만 집어 허용 목록에 걸리지 못했다 —
         * 즉 `tiptap-midibus`·`math-inline`·`math-display` 세 줄이 **적혀 있는데도 전부
         * 지워지고 있었다.** 커스텀 엘리먼트를 쓰는 이상 이름 규칙이 먼저 맞아야 한다.
         */
        .replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g, (match, tag, attrs) => {
        const lower = tag.toLowerCase();
        if (!ALLOWED_TAGS.has(lower))
            return "";
        const cleanAttrs = sanitizeAttributes(lower, attrs);
        const isClosing = match.startsWith("</");
        if (isClosing)
            return `</${lower}>`;
        const selfClosing = match.endsWith("/>");
        return `<${lower}${cleanAttrs}${selfClosing ? " /" : ""}>`;
    });
}
function sanitizeAttributes(tag, attrString) {
    const allowedForTag = ALLOWED_ATTRS[tag] ?? new Set();
    const allowedGlobal = ALLOWED_ATTRS["*"] ?? new Set();
    const result = [];
    const attrRegex = /([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let m;
    while ((m = attrRegex.exec(attrString)) !== null) {
        const name = m[1].toLowerCase();
        const value = m[2] ?? m[3] ?? m[4] ?? "";
        if (name.startsWith("on"))
            continue;
        if (!allowedForTag.has(name) && !allowedGlobal.has(name))
            continue;
        if ((name === "href" || name === "src") && !SAFE_URL_PATTERN.test(value)) {
            continue;
        }
        if (tag === "iframe" && name === "src" && !isAllowedIframeSrc(value)) {
            continue;
        }
        result.push(` ${name}="${escapeHtml(value)}"`);
    }
    return result.join("");
}
/*
 * 업로드 스켈레톤(`extensions/UploadSkeleton`)의 직렬화 태그. 스켈레톤은 "업로드 중"
 * 이라는 화면 상태지 내용이 아니라서 **저장 HTML 에 남으면 안 된다** — 이 패턴 하나를
 * 내보내기(`stripUploadSkeletonHtml`)와 읽기(`transformLegacyHtml`)가 같이 쓴다.
 * 태그 이름은 그쪽 `UPLOAD_SKELETON_NODE` 와 짝이다.
 */
const UPLOAD_SKELETON_PATTERN = /<tiptap-upload-skeleton[^>]*>(?:<\/tiptap-upload-skeleton>)?/gi;
/** 저장 직전 HTML 에서 업로드 스켈레톤을 걷어낸다. 없으면 원본 그대로. */
export function stripUploadSkeletonHtml(html) {
    if (!html || !html.includes("<tiptap-upload-skeleton"))
        return html;
    return html.replace(UPLOAD_SKELETON_PATTERN, "");
}
/**
 * 레거시 TipTap v2 커스텀 태그를 현재 형식으로 변환.
 * 에디터 content 로드 전, 또는 게시물 렌더링 전에 호출.
 * tiptap-file → data-file-id 변환. tiptap-midibus는 호스트 앱이 처리.
 */
export function transformLegacyHtml(html) {
    if (!html)
        return html;
    return (html
        // <tiptap-collapsable title="X">content</tiptap-collapsable>
        // → <details><summary>X</summary><div>content</div></details>
        .replace(/<tiptap-collapsable\s+title="([^"]*)">([\s\S]*?)<\/tiptap-collapsable>/gi, '<details><summary>$1</summary><div>$2</div></details>')
        // <tiptap-card title="T" background="B" height="H">content</tiptap-card>
        // → <div data-type="card" data-card-*>content</div>
        //
        // 정올 전용이던 카드 블록. 속성이 셋 다 선택적이고 순서도 보장되지 않아,
        // 여는 태그를 통째로 잡은 뒤 그 안에서 개별 속성을 뽑는다 —
        // 위 embed 처럼 순서별 규칙을 여러 개 두면 3! 가지가 되어 감당이 안 된다.
        .replace(/<tiptap-card\b([^>]*)>([\s\S]*?)<\/tiptap-card>/gi, (_match, rawAttrs, inner) => {
        const pick = (name) => {
            const m = rawAttrs.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
            return m ? m[1] : "";
        };
        const attrs = [
            `data-type="card"`,
            pick("title") && `data-card-title="${pick("title")}"`,
            pick("background") && `data-card-background="${pick("background")}"`,
            `data-card-height="${pick("height") || "190"}"`,
        ]
            .filter(Boolean)
            .join(" ");
        return `<div ${attrs}>${inner}</div>`;
    })
        // <embed src="X" type="application/pdf" ...>
        // → <div data-pdf-src="X" data-pdf-name="filename">
        .replace(/<embed\s+[^>]*src="([^"]*)"[^>]*type="application\/pdf"[^>]*\/?>/gi, (_match, src) => {
        const name = src.split("/").pop()?.replace(/\?.*$/, "") || "PDF";
        return `<div data-pdf-src="${src}" data-pdf-name="${name}"></div>`;
    })
        // Also handle reversed attribute order: type before src
        .replace(/<embed\s+[^>]*type="application\/pdf"[^>]*src="([^"]*)"[^>]*\/?>/gi, (_match, src) => {
        const name = src.split("/").pop()?.replace(/\?.*$/, "") || "PDF";
        return `<div data-pdf-src="${src}" data-pdf-name="${name}"></div>`;
    })
        // <tiptap-file id="X">text</tiptap-file>
        // → <div data-file-id="X" data-file-name="text">
        .replace(/<tiptap-file\s+id="([^"]*)"[^>]*>([^<]*)<\/tiptap-file>/gi, (_match, id, text) => {
        const name = text.trim() || "\uD30C\uC77C";
        return `<div data-file-id="${id}" data-file-name="${name}"></div>`;
    })
        /*
         * ⚠️ **옛 단(`div.tiptap-columns`)은 여기서 바꾸지 않는다.** 예전엔
         * `data-type="columns"` 로 갈아 끼워 `Columns` 가 편집할 수 있게 했는데,
         * 정올 prod 와 lms 는 **같은 Datastore 를 공유**한다 — 그렇게 저장하면 이번엔
         * prod 에디터가 그 형식을 몰라 단이 통째로 사라진다. 손해를 반대로 옮길 뿐이다.
         * 지금은 `LegacyBlock` 이 원본 마크업 그대로 품고 되쓴다(우선순위 100).
         */
        // <tiptap-upload-skeleton ...> 제거 — 위 `UPLOAD_SKELETON_PATTERN` 하나로 관리
        .replace(UPLOAD_SKELETON_PATTERN, ""));
}
export function stripHtmlToExcerpt(html, maxLen = 200) {
    const text = String(html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
    return text.length > maxLen ? text.slice(0, maxLen) + "\u2026" : text;
}
