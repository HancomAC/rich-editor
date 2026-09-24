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
export declare function renderStaticHtml(html: string, options?: RenderStaticHtmlOptions): string;
export { sanitizeHtml, transformLegacyHtml, stripHtmlToExcerpt } from "../utils/sanitize";
//# sourceMappingURL=index.d.ts.map