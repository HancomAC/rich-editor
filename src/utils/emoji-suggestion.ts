/**
 * 이모지 `:` 자동완성의 **로직 절반** — 정올 main(`plugin/command/emoji.ts`) 이식.
 *
 * main 은 `@tiptap/suggestion` 플러그인에 얹었지만 여기서는 코드 의존을 늘리지 않고
 * 슬래시 메뉴(`TipTapEditor` 의 `handleUpdate`)와 같은 방식 — 에디터 update 때마다 커서
 * 앞 텍스트를 읽어 판정 — 을 쓴다. 이 파일은 순수 함수만 두고(테스트 대상), 팝업·키보드는
 * `EmojiSuggestionMenu.svelte` 가 맡는다.
 *
 * 검색 의미론은 main 과 동일하다: `:smi` → 키워드(`:smile:` 꼴)에 `:smi` 가 **부분 문자열**
 * 로 들어가는 이모지를 앞에서부터 최대 10개. 키워드는 영문뿐이다(main 수준).
 */
import type { EditorState } from '@tiptap/pm/state';
import emojis from 'emojis-list';
import keywords from 'emojis-keywords';

export interface EmojiSuggestion {
	/** 삽입할 이모지 문자. */
	emoji: string;
	/** `:smile:` 꼴 키워드 — 목록에 이모지 옆에 그대로 보여 준다(main 과 같은 표기). */
	keyword: string;
}

export interface EmojiQueryMatch {
	/** `:` 위치(문서 좌표). 삽입 시 여기부터 커서까지 지운다. */
	from: number;
	/** 커서 위치(문서 좌표). */
	to: number;
	/** `:` 뒤에 친 검색어(콜론 제외). 빈 문자열이면 방금 `:` 만 친 상태다. */
	query: string;
}

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
export function searchEmojis(query: string, max: number = EMOJI_SUGGESTION_MAX): EmojiSuggestion[] {
	const normalizedQuery = `:${query.toLowerCase()}`;
	const found: EmojiSuggestion[] = [];

	for (let i = 0; i < emojis.length; i++) {
		const keyword = keywords[i];
		if (keyword && keyword.includes(normalizedQuery)) {
			found.push({ emoji: emojis[i], keyword });
			if (found.length >= max) break;
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
export function findEmojiQuery(state: EditorState): EmojiQueryMatch | null {
	const { empty, from, $from } = state.selection;
	if (!empty) return null;
	if ($from.parent.type.spec.code) return null;

	const lineStart = $from.start();
	// 리프 노드(이미지 등)는 한 글자짜리 표지로 세워 인덱스↔문서 좌표를 1:1로 유지한다.
	const lineText = state.doc.textBetween(lineStart, from, '\n', '￼');
	if (lineText.startsWith('/')) return null;

	const match = EMOJI_QUERY_REGEX.exec(lineText);
	if (!match) return null;

	const colonIndex = match.index + (match[0].startsWith(':') ? 0 : 1);
	return { from: lineStart + colonIndex, to: from, query: match[1] };
}
