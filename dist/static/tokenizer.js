/**
 * SSR-safe 경량 HTML 토크나이저 + 얕은 트리.
 *
 * `renderStaticHtml` 전용이다 — 범용 파서가 아니다. DOM(`DOMParser`) 없이 문자열만으로
 * 다음 세 가지를 판정하려고 만들었다:
 *
 *   1. 요소의 **자식 요소 유무** — 이미 하이라이트가 섞인 코드 판을 건너뛰는 판정
 *   2. 텍스트 노드의 **형제가 블록인지** — 블록 사이 공백만 지우고 인라인 공백은 남기는 판정
 *   3. 태그의 **속성 읽기·고쳐쓰기** — asset URL 치환
 *
 * ⚠️ **손대지 않은 노드는 원문 그대로 다시 내보낸다.** 요소는 여는 태그 원문(`rawTag`)을
 *    보관하고, 속성을 실제로 바꾼 요소만(`dirty`) 태그를 다시 조립한다 — DOMParser 왕복이
 *    일으키는 전면 재직렬화(속성 순서·따옴표·공백 정규화)를 피하고, 같은 입력이면 같은
 *    출력이 바이트 단위로 보장된다.
 *
 * 관대한 파서다: 짝 잃은 닫는 태그는 원문 그대로 흘려보내고(DOM 은 버리지만 여기선 보존이
 * 더 안전하다), 닫히지 않은 요소는 조상이 닫힐 때 같이 닫힌 것으로 본다. 에디터 저장본
 * (정형 HTML)에서는 어느 분기도 타지 않는다.
 */
import { escapeHtml } from "../utils/escape-html";
const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);
/** 내용을 마크업으로 파싱하지 않는 요소 — 닫는 태그까지 안을 원문(raw)으로 보관한다. */
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);
/**
 * 에디터 직렬화가 만드는 다섯 이름만 안다. 그 밖의 이름은 원문 그대로 남긴다 — 모르는 것을
 * 반쯤 디코드하는 쪽이 더 위험하다. 숫자 참조(`&#123;`·`&#x1F;`)는 전부 디코드한다.
 */
const NAMED_ENTITIES = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\u00a0",
};
/**
 * HTML 엔티티 디코드. 한 번의 치환 패스라 `&amp;lt;`는 `&lt;`가 된다(이중 디코드 없음) —
 * latex·코드 원문에 흔한 `<`·`&`를 정확히 되살리는 데 필요한 성질이다.
 */
export function decodeEntities(value) {
    if (!value.includes("&"))
        return value;
    return value.replace(/&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g, (match, decimal, hex, name) => {
        if (decimal)
            return codePointToString(parseInt(decimal, 10), match);
        if (hex)
            return codePointToString(parseInt(hex, 16), match);
        if (name)
            return NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? match;
        return match;
    });
}
function codePointToString(code, fallback) {
    try {
        return String.fromCodePoint(code);
    }
    catch {
        return fallback;
    }
}
/** 속성 하나: 이름 + (선택) `=` 값(따옴표 3종). `sanitizeAttributes`의 패턴에 값 없는 꼴을 더했다. */
const ATTR_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`<>]+)))?/g;
function parseAttributes(region) {
    const attrs = [];
    ATTR_PATTERN.lastIndex = 0;
    let match;
    while ((match = ATTR_PATTERN.exec(region)) !== null) {
        const raw = match[2] ?? match[3] ?? match[4];
        attrs.push({
            name: match[1].toLowerCase(),
            rawName: match[1],
            value: raw === undefined ? null : decodeEntities(raw),
        });
    }
    return attrs;
}
/** 여는 태그의 `>` 위치 — 따옴표 안의 `>`(`alt="a>b"`)는 끝이 아니다. */
function findTagEnd(html, from) {
    let quote = "";
    for (let index = from; index < html.length; index++) {
        const char = html[index];
        if (quote) {
            if (char === quote)
                quote = "";
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (char === ">")
            return index;
    }
    return -1;
}
export function parseHtml(html) {
    const root = { children: [] };
    const stack = [];
    const lower = html.toLowerCase();
    const top = () => (stack.length ? stack[stack.length - 1].children : root.children);
    const pushText = (raw) => {
        if (raw)
            top().push({ type: "text", raw });
    };
    let index = 0;
    while (index < html.length) {
        const lt = html.indexOf("<", index);
        if (lt === -1) {
            pushText(html.slice(index));
            break;
        }
        if (lt > index)
            pushText(html.slice(index, lt));
        const next = html[lt + 1];
        // 주석 — 닫힘이 없으면 나머지 전체가 주석이다(HTML 파서와 같은 처리).
        if (html.startsWith("<!--", lt)) {
            const close = html.indexOf("-->", lt + 4);
            const end = close === -1 ? html.length : close + 3;
            top().push({ type: "raw", raw: html.slice(lt, end) });
            index = end;
            continue;
        }
        // 독타입·CDATA·PI — 통째로 원문 보존.
        if (next === "!" || next === "?") {
            const gt = html.indexOf(">", lt);
            const end = gt === -1 ? html.length : gt + 1;
            top().push({ type: "raw", raw: html.slice(lt, end) });
            index = end;
            continue;
        }
        // 닫는 태그.
        if (next === "/") {
            const gt = html.indexOf(">", lt);
            if (gt === -1) {
                pushText(html.slice(lt));
                break;
            }
            const rawEnd = html.slice(lt, gt + 1);
            const name = /^<\/\s*([a-zA-Z][^\s/>]*)/.exec(rawEnd)?.[1]?.toLowerCase();
            index = gt + 1;
            if (!name) {
                top().push({ type: "raw", raw: rawEnd });
                continue;
            }
            let open = -1;
            for (let depth = stack.length - 1; depth >= 0; depth--) {
                if (stack[depth].name === name) {
                    open = depth;
                    break;
                }
            }
            if (open === -1) {
                // 짝 잃은 닫는 태그 — 원문 그대로 흘려보낸다.
                top().push({ type: "raw", raw: rawEnd });
                continue;
            }
            // 사이에 낀 미닫힘 요소들은 닫는 태그 없이 여기서 같이 닫힌 것으로 본다.
            while (stack.length > open + 1)
                stack.pop();
            stack[open].endTag = rawEnd;
            stack.pop();
            continue;
        }
        // 여는 태그.
        if (next && /[a-zA-Z]/.test(next)) {
            const gt = findTagEnd(html, lt + 1);
            if (gt === -1) {
                pushText(html.slice(lt));
                break;
            }
            const rawTag = html.slice(lt, gt + 1);
            // 위 /[a-zA-Z]/ 검사로 항상 성립한다.
            const rawName = /^<([a-zA-Z][^\s/>]*)/.exec(rawTag)[1];
            const name = rawName.toLowerCase();
            let region = rawTag.slice(1 + rawName.length, -1);
            const selfClosing = /\/\s*$/.test(region);
            if (selfClosing)
                region = region.replace(/\/\s*$/, "");
            const element = {
                type: "element",
                name,
                rawName,
                attrs: parseAttributes(region),
                rawTag,
                endTag: "",
                selfClosing,
                dirty: false,
                children: [],
            };
            top().push(element);
            index = gt + 1;
            if (selfClosing || VOID_ELEMENTS.has(name))
                continue;
            if (RAW_TEXT_ELEMENTS.has(name)) {
                const close = lower.indexOf(`</${name}`, index);
                if (close === -1) {
                    if (index < html.length)
                        element.children.push({ type: "raw", raw: html.slice(index) });
                    index = html.length;
                }
                else {
                    if (close > index)
                        element.children.push({ type: "raw", raw: html.slice(index, close) });
                    const endGt = html.indexOf(">", close);
                    const end = endGt === -1 ? html.length : endGt + 1;
                    element.endTag = html.slice(close, end);
                    index = end;
                }
                continue;
            }
            stack.push(element);
            continue;
        }
        // `<` 뒤가 태그 이름이 아니다 — 그냥 글자다(`a < b`).
        pushText(html[lt]);
        index = lt + 1;
    }
    return root;
}
export function serializeHtml(root) {
    let out = "";
    const walk = (node) => {
        if (node.type !== "element") {
            out += node.raw;
            return;
        }
        out += node.dirty ? buildStartTag(node) : node.rawTag;
        node.children.forEach(walk);
        out += node.endTag;
    };
    root.children.forEach(walk);
    return out;
}
/** `dirty` 요소의 여는 태그 재조립. 값은 큰따옴표로 통일하고 `escapeHtml`로 되감는다. */
function buildStartTag(element) {
    const attrs = element.attrs
        .map((attr) => attr.value === null ? ` ${attr.rawName}` : ` ${attr.rawName}="${escapeHtml(attr.value)}"`)
        .join("");
    return `<${element.rawName}${attrs}${element.selfClosing ? " /" : ""}>`;
}
/** DOM `getAttribute`처럼 — 첫 동명 속성, 값 없는 속성은 `""`, 없으면 `null`. */
export function getAttribute(element, name) {
    const found = element.attrs.find((attr) => attr.name === name);
    if (!found)
        return null;
    return found.value ?? "";
}
export function setAttribute(element, name, value) {
    const found = element.attrs.find((attr) => attr.name === name);
    if (found)
        found.value = value;
    else
        element.attrs.push({ name, rawName: name, value });
    element.dirty = true;
}
export function firstElementChild(element) {
    for (const child of element.children) {
        if (child.type === "element")
            return child;
    }
    return null;
}
/** DOM `textContent`처럼 자손 텍스트를 디코드해 잇는다. 주석·raw 조각은 세지 않는다. */
export function textContent(element) {
    let out = "";
    const walk = (node) => {
        if (node.type === "text")
            out += decodeEntities(node.raw);
        else if (node.type === "element")
            node.children.forEach(walk);
    };
    element.children.forEach(walk);
    return out;
}
