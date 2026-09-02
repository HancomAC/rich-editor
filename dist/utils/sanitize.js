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
]);
const ALLOWED_ATTRS = {
    a: new Set(["href", "title", "target", "rel"]),
    img: new Set(["src", "alt", "width", "height"]),
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
        // 유튜브·Vimeo 등 바깥 영상(`VideoEmbed`). mbus 와 **다른 이름**을 쓴다.
        "data-video-src",
        "data-video-width",
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
    "tiptap-midibus": new Set(["id", "start", "uuid", "width", "height"]),
    "*": new Set(["class", "id"]),
};
const SAFE_URL_PATTERN = /^(?:https?:\/\/|\/[\w])/i;
export function sanitizeHtml(html) {
    return String(html || "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag, attrs) => {
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
        result.push(` ${name}="${escapeHtml(value)}"`);
    }
    return result.join("");
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
        // <div class="tiptap-columns"> → <div data-type="columns">
        .replace(/<div\s+class="tiptap-columns">/gi, '<div data-type="columns">')
        // <div class="tiptap-column"> → <div data-type="column">
        .replace(/<div\s+class="tiptap-column">/gi, '<div data-type="column">')
        // <tiptap-upload-skeleton ...> 제거
        .replace(/<tiptap-upload-skeleton[^>]*>(?:<\/tiptap-upload-skeleton>)?/gi, ""));
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
