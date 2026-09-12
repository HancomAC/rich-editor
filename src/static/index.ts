/**
 * SSR-safe 정적 렌더 파이프라인 — 저장 HTML(문자열) → 읽기 전용 표시용 HTML(문자열).
 *
 * DOM·브라우저 전역 없이 동작한다(서버·워커·브라우저 어디서든 같은 입력이면 같은 출력).
 * lms 앱의 DOMParser 기반 `prepareStaticHtml`(`src/components/ui/tiptap/code/index.ts`)과
 * `assetMediaPreviewHtml`(`asset-media-preview.ts`)의 동작 등가가 목표이고, 수식 서버
 * 렌더(KaTeX)만 이 파이프라인이 새로 더한 것이다. 다섯 단계를 **한 번의 파싱**으로 처리한다:
 *
 *   1. 코드 블록에 문법 색 입히기            → `highlightCodeBlocks`
 *   2. 블록 사이 공백 전용 텍스트 노드 버리기 → `stripBlockGapWhitespace`
 *   3. `<math-inline>`·`<math-display>` 렌더  → `renderMathElements`
 *   4. `ol[type]` 마커 클래스 입히기          → `annotateOrderedListMarkers`
 *   5. 본문 속 자산 URL 치환                 → `rewriteAssetUrls` (옵션)
 *
 * ⚠️ **배럴(`../index.ts`)을 참조하지 않는다.** 배럴 1행이 `TipTapEditor`를 정적으로
 *    끌어와서, 여기서 그걸 스치기만 해도 읽기 전용 라우트의 에디터 지연 로딩이 통째로
 *    무효가 된다. 필요한 것은 전부 모듈 직접 경로로 가져오고, 이 파일도 같은 이유로
 *    `@teriusu/rich-editor/static` 서브패스로만 노출된다.
 */
import katex from "katex";
import { escapeHtml } from "../utils/escape-html";
import { highlightCodeToHtml } from "./highlight";
import {
  decodeEntities,
  firstElementChild,
  getAttribute,
  parseHtml,
  serializeHtml,
  setAttribute,
  textContent,
} from "./tokenizer";
import type { StaticElement, StaticNode, StaticRoot } from "./tokenizer";

export interface RewriteAssetUrlContext {
  /** 소문자 태그 이름(`img`·`a`·`div`…). */
  tag: string;
  /** 소문자 속성 이름(`src`·`srcset`·`href`·`style`·`background`). */
  attr: string;
}

export interface RenderStaticHtmlOptions {
  /**
   * 언어를 못 읽은 코드 블록에 쓸 언어. 확장이 보는 `attrs.language || defaultLanguage`와
   * 같은 자리다. **호출부가 정한다** — 어느 코드블록 확장이 실렸느냐로 값이 갈린다.
   * 패키지 기본 에디터(`TipTapEditor`)와 짝이면 `"cpp"`, 호스트가 자기 코드블록 확장을
   * 실었다면 그 확장의 기본값. 생략하면 `""`(자동 감지).
   */
  defaultLanguage?: string;
  /**
   * 본문 속 자산 URL 치환 훅. `src`·`href`는 값 전체가 URL 하나로, `srcset`은 후보마다,
   * `style`·`background`는 `url(…)` 안쪽마다 **URL 하나씩** 불린다 — 단일 URL을 받는
   * 함수(앱 `assetUrl` 류)를 그대로 꽂으면 다섯 속성이 전부 감당된다. 원본과 같은 값을
   * 돌려주면 그 속성은 원문 그대로 남는다.
   */
  rewriteAssetUrl?: (url: string, context: RewriteAssetUrlContext) => string;
}

/**
 * 저장 HTML을 **에디터가 그리는 것과 같아 보이게** 손질해 돌려준다. 순수 함수다 —
 * 입력을 바꾸지 않고, 같은 입력이면 항상 같은 출력이며, 할 일이 없으면 원본 문자열을
 * 그대로 돌려준다(재직렬화본으로 바꾸지 않는다).
 *
 * ⚠️ 입력은 `sanitizeHtml` 을 **이미 거친** HTML 이어야 한다 — 여기서는 살균하지 않고,
 * 손대지 않은 구간은 원문 바이트 그대로 통과시킨다.
 */
export function renderStaticHtml(html: string, options: RenderStaticHtmlOptions = {}): string {
  if (!html) return html;
  /*
   * ── 빠른 탈출 ── 할 일이 없으면 파싱조차 하지 않는다. 단계별 필요 조건을 문자열만
   * 보고 먼저 가른다 — 앱 `prepareStaticHtml`의 가드와 같은 식이고(코드 판 유무, 태그
   * 사이 개행 유무), 뒤의 두 조건(수식·URL 치환)만 이 파이프라인이 더한 것이다.
   */
  const hasCodeBlock = /<pre[\s>]/i.test(html);
  const hasTagGapNewline = />\s*[\n\r]\s*</.test(html);
  const hasMath = /<math-(?:inline|display)[\s>]/i.test(html);
  // `\stype` — 공백 뒤의 진짜 `type` 속성만. `data-type=`(하이픈 뒤)은 `\s`에 안 걸린다.
  const hasTypedOl = /<ol[^>]*\stype\s*=/i.test(html);
  const rewrite = options.rewriteAssetUrl;
  const hasAssetAttr = !!rewrite && /\b(?:src|srcset|href|style|background)\s*=/i.test(html);
  if (!hasCodeBlock && !hasTagGapNewline && !hasMath && !hasTypedOl && !hasAssetAttr) return html;

  const root = parseHtml(html);
  let touched = false;
  if (hasCodeBlock) touched = highlightCodeBlocks(root, options.defaultLanguage ?? "") || touched;
  if (hasTagGapNewline) touched = stripBlockGapWhitespace(root) || touched;
  if (hasMath) touched = renderMathElements(root) || touched;
  if (hasTypedOl) touched = annotateOrderedListMarkers(root) || touched;
  if (rewrite && hasAssetAttr) touched = rewriteAssetUrls(root, rewrite) || touched;
  return touched ? serializeHtml(root) : html;
}

/** 모든 요소를 문서 순서로 방문한다. 방문 중 바꾼 자식(`raw` 주입)은 더 내려가지 않는다. */
function walkElements(root: StaticRoot, visit: (element: StaticElement) => void): void {
  const walk = (node: StaticNode): void => {
    if (node.type !== "element") return;
    visit(node);
    node.children.forEach(walk);
  };
  root.children.forEach(walk);
}

/* ─────────────────────── 순서목록 마커 클래스 (`ol[type]`) ─────────────────────── */

/**
 * `<ol type="A">` 에 `marker-A` 클래스를 입힌다 — 에디터의 `OrderedListMarker.renderHTML`
 * 이 하는 것과 같은 일을 표시 시점에 하는 것이다. CSS 속성 선택자는 HTML `type` 값을
 * **대소문자 무시**로 매치해서(`[type='a']` 가 `A` 도 잡는다) 속성만으로는 lower/upper 를
 * 못 가른다 — 클래스 선택자는 구분한다(`editor.css` 의 `.tiptap ol.marker-*`).
 * 정올 main 에디터가 저장한 본문은 클래스 없이 `type` 만 있으므로 여기서 채워야
 * `A.` 로 만든 목록이 정적 렌더에서 `a.` 로 내려앉지 않는다. 이미 있으면 안 건드린다.
 */
function annotateOrderedListMarkers(root: StaticRoot): boolean {
  let touched = false;
  walkElements(root, (element) => {
    if (element.name !== "ol") return;
    const type = getAttribute(element, "type");
    if (!type) return;
    const marker = `marker-${type}`;
    const existing = getAttribute(element, "class");
    if (existing && existing.split(/\s+/).includes(marker)) return;
    setAttribute(element, "class", existing ? `${existing} ${marker}` : marker);
    touched = true;
  });
  return touched;
}

/* ────────────────────────── 1. 코드 블록 하이라이트 ────────────────────────── */

/**
 * 저장된 HTML은 `<pre><code class="language-cpp">원본</code></pre>`이 전부고, 색은 에디터가
 * 살아 있을 때 lowlight가 그때그때 덧씌운다. 여기서 미리 입혀 정적 렌더가 흑백이었다가
 * 에디터로 바뀌는 순간 색이 튀는 것을 없앤다. 앱 `highlightCodeBlocks`와 동작 등가.
 */
function highlightCodeBlocks(root: StaticRoot, defaultLanguage: string): boolean {
  let touched = false;
  walkElements(root, (element) => {
    /*
     * ⚠️ `pre > code`가 아니라 `pre`를 본다 — 옛 SyntaxHighlighter 저장본은
     * `<pre class="brush:c++; toolbar:false;">코드</pre>`처럼 `<code>` 자식이 아예 없다.
     */
    if (element.name !== "pre") return;
    /*
     * 확장의 `parseHTML`은 `pre`의 **첫 요소 자식**에서 `language-*`를 읽는다.
     * 그 자식이 `code`면 색은 그 안에, 없으면 `pre` 자신에 넣는다.
     * ⚠️ **구조는 손대지 않는다** — `<code>`를 새로 감싸거나 클래스를 고치지 않고
     *    `span`만 안에 넣는다(교체 전후 `pre` 높이가 이미 맞아 있다).
     */
    const first = firstElementChild(element);
    const target = first && first.name === "code" ? first : element;
    /* 이미 요소가 섞여 있는 저장본(`<br>`·기존 `span` 등)은 손대지 않는다 — 글자가 어긋날 수 있다. */
    if (firstElementChild(target)) return;
    const text = textContent(target);
    if (!text) return;
    /*
     * ⚠️ `brush:c++` 같은 옛 클래스에서 언어를 추측하지 않는다 — 에디터도 못 읽는 표기라
     *    우리만 읽으면 정적 쪽만 다른 언어로 칠해져 색이 갈린다. 기본 언어로 떨어지는 게 맞다.
     */
    const language = readCodeLanguage(first) || defaultLanguage;
    const inner = highlightCodeToHtml(language, text);
    if (!inner) return;
    target.children = [{ type: "raw", raw: inner }];
    touched = true;
  });
  return touched;
}

/**
 * `<code class="language-cpp">`에서 언어를 뽑는다. 확장의 `parseHTML`과 같은 규칙이라
 * 에디터가 고르는 언어와 어긋나지 않는다. 요소가 없으면(옛 `brush:` 마크업) 빈 문자열.
 */
function readCodeLanguage(element: StaticElement | null): string {
  if (!element) return "";
  const prefix = "language-";
  const found = (getAttribute(element, "class") ?? "")
    .split(/\s+/)
    .find((name) => name.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

/* ────────────────────────── 2. 블록 사이 공백 제거 ────────────────────────── */

/*
 * ⚠️ 태그 이름표로 블록을 판정한다(`getComputedStyle`이 없는 세계다). 목록은 **살균기를
 * 통과하는 태그**(`utils/sanitize.ts`의 `ALLOWED_TAGS`) 중 블록인 것들 — 살균 허용 목록이
 * 늘면 여기도 같이 봐야 한다(빠진 블록은 앞뒤 빈 줄이 안 지워져 그 항목만 정적 대역이
 * 커진다). 앱 `BLOCK_TAGS`와 같은 목록이다.
 */
const BLOCK_TAGS = new Set([
  "blockquote",
  "col",
  "colgroup",
  "div",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "math-display",
  "ol",
  "p",
  "pre",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

function isBlockElement(node: StaticNode | null | undefined): boolean {
  return !!node && node.type === "element" && BLOCK_TAGS.has(node.name);
}

/**
 * 공백 노드가 **블록 사이의 틈**인지. 앞뒤 형제 중 하나라도 블록이면 틈이고, 형제가 아예
 * 없으면 블록 컨테이너 안의 빈 줄이다. 둘 다 아니면 **인라인 사이의 공백**이라 남긴다(`a b`).
 */
function isBlockGap(siblings: StaticNode[], index: number, parent: StaticElement | null): boolean {
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  if (isBlockElement(prev) || isBlockElement(next)) return true;
  return !prev && !next && isBlockElement(parent);
}

/**
 * 저장 HTML에서 **블록 사이의 공백 전용 텍스트 노드**를 지운다 — ProseMirror 파서가
 * 콘텐츠를 물 때 하는 일과 같다. 저장본은 블록 태그 사이마다 `"\n\n"` 텍스트 노드를 갖고
 * 있는데, `.tiptap.ProseMirror`의 `white-space: break-spaces` 아래서 그 개행이 진짜 빈
 * 줄로 그려지고 인접 블록의 마진 상쇄까지 막는다(실측 수치는 앱 쪽 주석). 앱
 * `stripBlockGapWhitespace`와 동작 등가:
 *
 * ⚠️ **정규식(`>\s+<`)으로 지우지 않는다** — `<p><strong>a</strong> <em>b</em></p>`처럼
 *    인라인 사이의 의미 있는 공백까지 지워 `a b`가 `ab`로 붙는다. 그래서 트리를 보고
 *    형제가 무엇인지로 가른다.
 * ⚠️ **`pre`·`code` 안은 통째로 건너뛴다** — 거기서는 개행과 들여쓰기가 내용이다.
 */
function stripBlockGapWhitespace(root: StaticRoot): boolean {
  let touched = false;
  const visit = (container: StaticRoot | StaticElement): void => {
    if ("name" in container && (container.name === "pre" || container.name === "code")) return;
    const children = container.children;
    for (const child of children) {
      if (child.type === "element") visit(child);
    }
    const keep = children.filter((child, index) => {
      if (child.type !== "text") return true;
      /* 글자가 하나라도 있으면 내용이다. ⚠️ 디코드해서 본다 — `&nbsp;`(U+00A0)도 `\s`다. */
      if (/\S/.test(decodeEntities(child.raw))) return true;
      return !isBlockGap(children, index, "name" in container ? container : null);
    });
    if (keep.length !== children.length) {
      container.children = keep;
      touched = true;
    }
  };
  visit(root);
  return touched;
}

/* ────────────────────────── 3. 수식 서버 렌더 ────────────────────────── */

/**
 * `<math-inline>`·`<math-display>`를 KaTeX 렌더로 채운다 — 앱의 정적 렌더에는 없는
 * **신규** 단계다(거기선 NodeView가 클라이언트에서 그린다).
 *
 * 저장 HTML에는 latex가 **자식 텍스트로만** 남는다(`extensions/Math.ts`의 `renderHTML` —
 * KaTeX 결과는 저장하지 않는다). 바깥 태그는 속성째 보존하고 안만 바꾼다 — NodeView도
 * 같은 태그(`class="math-node"`)를 유지한 채 `innerHTML`만 채우므로 CSS가 같은 자리에
 * 붙는다.
 */
function renderMathElements(root: StaticRoot): boolean {
  let touched = false;
  walkElements(root, (element) => {
    if (element.name !== "math-inline" && element.name !== "math-display") return;
    /* 이미 요소가 들어 있으면(렌더 결과 등) 손대지 않는다 — 출력 재투입에도 안전하다. */
    if (firstElementChild(element)) return;
    const latex = textContent(element).trim();
    /*
     * 빈 수식은 그대로 둔다. NodeView의 `수식 입력` placeholder는 편집 UI라 읽기 전용
     * 정적 렌더에는 넣지 않는다 — 어차피 그릴 내용이 없다.
     */
    if (!latex) return;
    element.children = [{ type: "raw", raw: renderKatex(latex, element.name === "math-display") }];
    touched = true;
  });
  return touched;
}

/**
 * `extensions/Math.ts`의 `renderKatex`와 **같은 옵션**이어야 한다 — 정적 렌더와 에디터
 * NodeView의 시각 결과가 갈리면 바꿔 끼울 때 수식이 튄다. 실패 폴백만 이스케이프를
 * 더했다(NodeView는 자기 DOM에 넣지만 여기는 문자열에 원문을 주입하면 안 된다).
 */
function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return `<span class="math-error">${escapeHtml(latex)}</span>`;
  }
}

/* ────────────────────────── 4. 자산 URL 치환 ────────────────────────── */

/**
 * 앱 `assetMediaPreviewHtml`이 치환하는 태그·속성 전부: `[src], [srcset], [href], [style],
 * [background]` — 값 파싱 규칙(`srcset` 후보 나누기, CSS `url(…)` 추출)도 앱의
 * `assetSrcset`·`assetCssUrls`와 같다.
 */
const REWRITE_ATTRS = ["src", "srcset", "href", "style", "background"] as const;

function rewriteAssetUrls(
  root: StaticRoot,
  rewrite: (url: string, context: RewriteAssetUrlContext) => string,
): boolean {
  let touched = false;
  walkElements(root, (element) => {
    for (const attr of REWRITE_ATTRS) {
      const value = getAttribute(element, attr);
      if (value === null) continue;
      const context: RewriteAssetUrlContext = { tag: element.name, attr };
      const rewriteOne = (url: string): string => rewrite(url, context);
      let next: string;
      if (attr === "srcset") next = rewriteSrcset(value, rewriteOne);
      else if (attr === "style" || attr === "background") next = rewriteCssUrls(value, rewriteOne);
      else next = rewriteOne(value);
      if (next !== value) {
        setAttribute(element, attr, next);
        touched = true;
      }
    }
  });
  return touched;
}

/**
 * srcset 후보별 치환 — URL은 공백에서 끝나고, data URL 속 쉼표는 후보 구분자가 아니다.
 * 앱 `assetSrcset`과 같은 스캔이다(콜백만 밖에서 받는다).
 */
function rewriteSrcset(value: string, rewrite: (url: string) => string): string {
  let result = "";
  let offset = 0;
  while (offset < value.length) {
    const leading = /^[\s,]*/.exec(value.slice(offset))![0];
    result += leading;
    offset += leading.length;
    if (offset === value.length) break;
    const token = /^\S+/.exec(value.slice(offset))![0];
    const url = token.replace(/,+$/, "");
    result += rewrite(url) + token.slice(url.length);
    offset += token.length;
    if (url.length !== token.length) continue;
    let depth = 0;
    while (offset < value.length) {
      const char = value[offset++];
      result += char;
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (char === "," && depth === 0) break;
    }
  }
  return result;
}

/**
 * CSS 값 속 `url(…)` 안쪽 치환. 안 바뀌면 원문 표기 그대로, 바뀌면 `url("…")`로 통일 —
 * 앱 `assetCssUrls`와 같은 규칙이다.
 */
function rewriteCssUrls(value: string, rewrite: (url: string) => string): string {
  return value.replace(
    /url\(\s*(?:"([^"\\]*)"|'([^'\\]*)'|([^)'"\\]*))\s*\)/gi,
    (match, doubleQuoted: string | undefined, singleQuoted: string | undefined, bare: string) => {
      const original = (doubleQuoted ?? singleQuoted ?? bare).trim();
      const rewritten = rewrite(original);
      return rewritten === original ? match : `url("${rewritten}")`;
    },
  );
}

/*
 * 살균·레거시 변환·요약 재수출 — 정적 렌더와 늘 붙어 다닌다(살균 → 정적 렌더 순으로 쓴다).
 * ⚠️ 배럴이 아니라 **모듈 직접 경로**에서 가져온다 — 파일 머리 주석 참고.
 */
export { sanitizeHtml, transformLegacyHtml, stripHtmlToExcerpt } from "../utils/sanitize";
