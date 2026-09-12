/**
 * 코드 블록 정적 하이라이트 — lowlight(hast) 결과를 HTML 문자열로.
 *
 * lms 앱 `src/components/ui/tiptap/code/index.ts`의 `createCodeBlockLowlight`·
 * `highlightCodeText`·`serializeHighlight`와 **동작 등가**여야 한다. 정적으로 미리 칠한
 * 색과 에디터가 서면서 lowlight가 칠하는 색이 갈리면, 바꿔 끼우는 순간 색이 통째로 튄다.
 * 등록 언어 목록도 같은 한 벌(`utils/lowlight.ts`)을 쓴다.
 */
import { lowlight } from "../utils/lowlight";
import { escapeHtml } from "../utils/escape-html";
/**
 * `자동`(언어 미지정)일 때 후보로 삼을 언어. **lms 앱 `AUTO_DETECT_SUBSET`과 같은 값이어야
 * 한다** — 한쪽만 바뀌면 정적 색과 에디터 색이 갈린다. 실측상 후보를 늘릴수록 감지가 급격히
 * 나빠지고(190개 등록 → C++을 `properties`로 판정), `c`는 relevance를 과하게 먹어 Python
 * 코드까지 `c`로 판정해서 뺐다. 상세 실측 기록은 앱 쪽 주석에 있다.
 */
export const AUTO_DETECT_SUBSET = ["cpp", "java", "python"];
/** hast 트리에서 강조 토큰(element) 수. 후보가 전부 0점일 때 승자를 고르는 기준이다. */
function countHighlightTokens(tree) {
    let total = 0;
    const walk = (node) => {
        if (node.type === "element")
            total += 1;
        (node.children ?? []).forEach(walk);
    };
    (tree.children ?? []).forEach(walk);
    return total;
}
/**
 * 자동 감지. 후보를 `AUTO_DETECT_SUBSET`으로 좁히고, **후보가 전부 relevance 0이면**
 * (타입 선언도 `#include`도 없는 짧은 조각에서 흔하다) hljs가 승자를 고르지 않아 토큰이
 * 하나도 없는 트리가 돌아온다 — 그때는 같은 후보 안에서 토큰이 가장 많이 잡히는 언어로
 * 칠한다. 앱 `createCodeBlockLowlight`의 `highlightAuto` 래퍼와 같은 갈림이다.
 */
function autoHighlight(value) {
    const auto = lowlight.highlightAuto(value, { subset: AUTO_DETECT_SUBSET });
    if (auto.data?.language)
        return auto;
    let best = null;
    for (const language of AUTO_DETECT_SUBSET) {
        if (!lowlight.registered(language))
            continue;
        const tree = lowlight.highlight(language, value);
        const count = countHighlightTokens(tree);
        if (!best || count > best.count)
            best = { count, tree };
    }
    return best && best.count > 0 ? best.tree : auto;
}
/**
 * 언어를 알면 그것으로, 모르거나 등록 안 된 언어면 자동 감지로 — 확장의 `getDecorations`와
 * 같은 갈림(앱 `highlightCodeText`). 결과가 빈 문자열이면 강조할 것이 없다는 뜻이다.
 */
export function highlightCodeToHtml(language, text) {
    /* `registered`를 먼저 본다 — 목록을 만들지 않는 조회라 블록마다 불려도 싸다. */
    const known = !!language && (lowlight.registered(language) || lowlight.listLanguages().includes(language));
    const tree = known ? lowlight.highlight(language, text) : autoHighlight(text);
    return serializeHighlight(tree);
}
/**
 * hast 트리 → HTML 문자열.
 *
 * ⚠️ **에디터가 만드는 마크업과 같은 모양이어야** 바꿔 낄 때 색이 안 튄다. 에디터 쪽은
 *    hast를 ProseMirror 인라인 데코레이션으로 붙이며 트리를 **납작하게 편다** — 조상의
 *    클래스를 자식에 물려주며 잎 텍스트마다 합친 클래스의 `span` 한 겹만 만든다. 중첩을
 *    그대로 살리면 같은 CSS에서도 다른 색이 나오므로 여기서도 똑같이 편다.
 *    (앱 `serializeHighlight`와 동일. `hast-util-to-html` 같은 의존을 새로 들이지 않는다 —
 *    여기 나오는 노드는 element와 text 둘뿐이다.)
 */
function serializeHighlight(tree) {
    /* 확장의 `getHighlightNodes`와 같게 — 옛 hljs 결과는 `value`, lowlight는 `children`이다. */
    const roots = Array.isArray(tree.value)
        ? tree.value
        : (tree.children ?? []);
    let out = "";
    const walk = (node, inherited) => {
        const own = classNamesOf(node);
        const classes = own.length ? [...inherited, ...own] : inherited;
        /* 자식이 있으면 **자기 자신은 그리지 않고** 클래스만 물려준다(= 납작하게 편다). */
        if (node.children) {
            node.children.forEach((child) => walk(child, classes));
            return;
        }
        const text = typeof node.value === "string" ? node.value : "";
        if (!text)
            return;
        out += classes.length
            ? `<span class="${escapeHtml(classes.join(" "))}">${escapeHtml(text)}</span>`
            : escapeHtml(text);
    };
    roots.forEach((node) => walk(node, []));
    return out;
}
function classNamesOf(node) {
    const raw = node.properties?.className;
    if (Array.isArray(raw))
        return raw.filter((name) => typeof name === "string");
    return typeof raw === "string" ? [raw] : [];
}
