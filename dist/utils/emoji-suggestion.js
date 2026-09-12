import emojis from 'emojis-list';
import keywords from 'emojis-keywords';
/** 후보 최대 수 — main 과 같다. */
export const EMOJI_SUGGESTION_MAX = 10;
/**
 * 커서 앞 텍스트에서 진행 중인 `:query` 를 찾는 패턴. `:` 는 **줄 시작이나 공백 뒤**에서만
 * 트리거된다(main 이 쓴 `@tiptap/suggestion` 의 기본 prefix 규칙과 같다 — `예: 값` 같은
 * 일반 문장 속 콜론에 팝업이 뜨지 않게 하는 조건이다). 검색어에 공백·콜론이 들어오면
 * (`:x `, `::`) 판정이 끝난 것으로 본다.
 */
export const EMOJI_QUERY_REGEX = /(?:^|\s):([^\s:]*)$/;
/** 키워드에 `:query`(소문자화)가 들어가는 이모지를 앞에서부터 최대 `max`개. */
export function searchEmojis(query, max = EMOJI_SUGGESTION_MAX) {
    const normalizedQuery = `:${query.toLowerCase()}`;
    const found = [];
    for (let i = 0; i < emojis.length; i++) {
        const keyword = keywords[i];
        if (keyword && keyword.includes(normalizedQuery)) {
            found.push({ emoji: emojis[i], keyword });
            if (found.length >= max)
                break;
        }
    }
    return found;
}
/**
 * 지금 커서 자리에서 이모지 자동완성이 진행 중인지 판정한다. 아니면 `null`.
 *
 * 슬래시 메뉴(`handleUpdate`)와 같은 제외 규칙을 지킨다:
 * - 선택이 펼쳐져 있으면(드래그 중) 안 띄운다.
 * - 코드블록 안에서는 안 띄운다(`std::vector` 같은 코드가 트리거되면 안 된다 —
 *   `::` 는 어차피 패턴에서 빠지지만 가드를 맞춰 둔다).
 * - 줄이 `/` 로 시작하면 슬래시 메뉴 영역이다 — 두 팝업이 겹치면 Enter 를 서로 뺏는다.
 */
export function findEmojiQuery(state) {
    const { empty, from, $from } = state.selection;
    if (!empty)
        return null;
    if ($from.parent.type.spec.code)
        return null;
    const lineStart = $from.start();
    // 리프 노드(이미지 등)는 한 글자짜리 표지로 세워 인덱스↔문서 좌표를 1:1로 유지한다.
    const lineText = state.doc.textBetween(lineStart, from, '\n', '￼');
    if (lineText.startsWith('/'))
        return null;
    const match = EMOJI_QUERY_REGEX.exec(lineText);
    if (!match)
        return null;
    const colonIndex = match.index + (match[0].startsWith(':') ? 0 : 1);
    return { from: lineStart + colonIndex, to: from, query: match[1] };
}
