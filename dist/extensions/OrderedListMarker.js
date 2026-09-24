/**
 * 순서목록 마커 확장 — 정올 main(`packages/tiptap/plugin/orderedlist`, 커밋 9362eef6) 이식.
 *
 * `1. ` 만 받던 순서목록 입력 규칙을 여섯 마커로 넓힌다:
 *
 * | 치는 것 | type | 표시 |
 * |---|---|---|
 * | `1.` `2.` … | (없음) | decimal |
 * | `a.` ~ `z.` | `a` | lower-alpha |
 * | `A.` ~ `Z.` | `A` | upper-alpha |
 * | `i.` | `i` | lower-roman |
 * | `I.` | `I` | upper-roman |
 * | `ㄱ.` ~ `ㅎ.` | `kors` | ㄱ. ㄴ. …(카운터 스타일) |
 * | `가.` ~ `하.` | `korc` | 가. 나. …(카운터 스타일) |
 *
 * 중간 값으로 시작하면(`3.` `c.` `다.`) `start` 가 잡히고, **직전 목록의 다음 번호면 그
 * 목록에 이어붙는다**(`canJoinSequentialList`). 마커 종류가 다르면 번호가 이어져도 안 붙는다.
 *
 * ⚠️ **main 과 다른 점 둘.**
 * 1. 숫자 목록의 `type` 을 심지 않는다(main 은 default `'1'` 이라 모든 `<ol>` 에
 *    `type="1"` 이 붙는다). 기존 저장본·왕복 결과를 그대로 두기 위해서다 — 판정은
 *    `type ?? '1'` 로 동일하다.
 * 2. `renderHTML` 이 `marker-<type>` 클래스를 함께 심는다. CSS 속성 선택자는 HTML `type`
 *    값을 **대소문자 무시**로 매치해서(`[type='a']` 가 `A` 도 잡는다) 속성만으로는
 *    lower/upper 를 가를 수 없다 — 클래스 선택자는 대소문자를 구분한다.
 *    (main 은 앱 CSS 가 `ol` 의 list-style 을 안 덮어서 UA 의 type 속성 매핑으로 충분했다.
 *    여기는 `editor.css` 가 `.tiptap ol { list-style: decimal }` 을 깔아 그 길이 막혀 있다.)
 *
 * 편집기 밖 표시: 정올 main 이 저장한 옛 본문(`<ol type="A">`, 클래스 없음)은 정적 렌더
 * (`src/static/index.ts` 의 `annotateOrderedListMarkers`)가 같은 클래스를 표시 시점에 입힌다.
 */
import { mergeAttributes, wrappingInputRule } from '@tiptap/core';
import { OrderedList } from '@tiptap/extension-list';
const KOREAN_CONSONANTS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const KOREAN_SYLLABLES = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
/**
 * 직전 목록에 이어붙일 수 있나 — 마커 종류가 같고, 목록의 다음 번호(start + 항목 수)가
 * 방금 친 번호와 같아야 한다. `type` 없는 목록은 숫자 목록(`'1'`)으로 본다.
 */
const canJoinSequentialList = (node, type, markerOrdinal) => {
    const nodeType = node.attrs.type || '1';
    const nodeStart = Number(node.attrs.start ?? 1);
    return nodeType === type && nodeStart + node.childCount === markerOrdinal;
};
export const OrderedListMarker = OrderedList.extend({
    renderHTML({ HTMLAttributes }) {
        const { start, type, ...rest } = HTMLAttributes;
        const attrs = { ...rest };
        // 기본 확장과 같은 규칙 — start 1 은 안 적는다(적으나 안 적으나 같은 목록이다).
        if (start !== undefined && start !== null && start !== 1)
            attrs.start = start;
        if (type) {
            attrs.type = type;
            attrs.class = `marker-${type}`;
        }
        return ['ol', mergeAttributes(this.options.HTMLAttributes, attrs), 0];
    },
    addInputRules() {
        /*
         * ⚠️ 규칙 순서가 곧 우선순위다. `i.`/`I.`(로마 숫자)는 `a-z`/`A-Z`(알파벳)에도
         * 걸리므로 **로마 숫자 규칙이 먼저** 와야 한다 — main 과 같은 배치.
         */
        return [
            wrappingInputRule({
                find: /^(\d+)\.\s$/,
                type: this.type,
                getAttributes: (match) => ({ start: +match[1] }),
                joinPredicate: (match, node) => canJoinSequentialList(node, '1', +match[1])
            }),
            wrappingInputRule({
                find: /^i\.\s$/,
                type: this.type,
                getAttributes: () => ({ start: 1, type: 'i' }),
                joinPredicate: (_match, node) => canJoinSequentialList(node, 'i', 1)
            }),
            wrappingInputRule({
                find: /^I\.\s$/,
                type: this.type,
                getAttributes: () => ({ start: 1, type: 'I' }),
                joinPredicate: (_match, node) => canJoinSequentialList(node, 'I', 1)
            }),
            wrappingInputRule({
                find: /^([A-Z])\.\s$/,
                type: this.type,
                getAttributes: (match) => ({ start: match[1].charCodeAt(0) - 64, type: 'A' }),
                joinPredicate: (match, node) => canJoinSequentialList(node, 'A', match[1].charCodeAt(0) - 64)
            }),
            wrappingInputRule({
                find: /^([a-z])\.\s$/,
                type: this.type,
                getAttributes: (match) => ({ start: match[1].charCodeAt(0) - 96, type: 'a' }),
                joinPredicate: (match, node) => canJoinSequentialList(node, 'a', match[1].charCodeAt(0) - 96)
            }),
            wrappingInputRule({
                find: /^([ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ])\.\s$/,
                type: this.type,
                getAttributes: (match) => ({
                    start: 1 + KOREAN_CONSONANTS.indexOf(match[1]),
                    type: 'kors'
                }),
                joinPredicate: (match, node) => canJoinSequentialList(node, 'kors', 1 + KOREAN_CONSONANTS.indexOf(match[1]))
            }),
            wrappingInputRule({
                find: /^([가나다라마바사아자차카타파하])\.\s$/,
                type: this.type,
                getAttributes: (match) => ({
                    start: 1 + KOREAN_SYLLABLES.indexOf(match[1]),
                    type: 'korc'
                }),
                joinPredicate: (match, node) => canJoinSequentialList(node, 'korc', 1 + KOREAN_SYLLABLES.indexOf(match[1]))
            })
        ];
    }
});
