/**
 * `자동`(언어 미지정)일 때 후보로 삼을 언어. **lms 앱 `AUTO_DETECT_SUBSET`과 같은 값이어야
 * 한다** — 한쪽만 바뀌면 정적 색과 에디터 색이 갈린다. 실측상 후보를 늘릴수록 감지가 급격히
 * 나빠지고(190개 등록 → C++을 `properties`로 판정), `c`는 relevance를 과하게 먹어 Python
 * 코드까지 `c`로 판정해서 뺐다. 상세 실측 기록은 앱 쪽 주석에 있다.
 */
export declare const AUTO_DETECT_SUBSET: string[];
/**
 * 언어를 알면 그것으로, 모르거나 등록 안 된 언어면 자동 감지로 — 확장의 `getDecorations`와
 * 같은 갈림(앱 `highlightCodeText`). 결과가 빈 문자열이면 강조할 것이 없다는 뜻이다.
 */
export declare function highlightCodeToHtml(language: string, text: string): string;
//# sourceMappingURL=highlight.d.ts.map