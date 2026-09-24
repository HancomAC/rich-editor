import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
	searchEmojis,
	findEmojiQuery,
	EMOJI_SUGGESTION_MAX,
	EMOJI_QUERY_REGEX
} from './emoji-suggestion';

describe('이모지 자동완성 · 검색 (searchEmojis)', () => {
	it('키워드 부분 일치로 찾고, 정확한 키워드도 물려 온다', () => {
		const results = searchEmojis('smile');
		expect(results.length).toBeGreaterThan(0);
		expect(results.length).toBeLessThanOrEqual(EMOJI_SUGGESTION_MAX);
		for (const result of results) {
			expect(result.keyword).toContain(':smile');
			expect(result.emoji.length).toBeGreaterThan(0);
		}
		expect(results.some((result) => result.keyword === ':smile:')).toBe(true);
	});

	it('대문자로 쳐도 같은 결과다 (소문자 정규화)', () => {
		expect(searchEmojis('SMILE')).toEqual(searchEmojis('smile'));
	});

	it('빈 검색어(`:` 만 친 상태)는 전부 매치 — 최대 10개에서 끊는다', () => {
		expect(searchEmojis('').length).toBe(EMOJI_SUGGESTION_MAX);
		expect(searchEmojis('a').length).toBe(EMOJI_SUGGESTION_MAX);
	});

	it('없는 검색어는 빈 배열', () => {
		expect(searchEmojis('이런이모지는없다zzz')).toEqual([]);
	});

	it('max 인자로 개수를 줄일 수 있다', () => {
		expect(searchEmojis('', 3)).toHaveLength(3);
	});

	/*
	 * ⚠️ 두 데이터 패키지는 **같은 인덱스가 짝**이라는 가정 위에 서 있다
	 * (emojis-list 3.0.0 ↔ emojis-keywords 2.0.0, main 과 같은 버전 고정).
	 * 버전이 엇갈려 정렬이 어긋나면 엉뚱한 이모지가 나온다 — 첫 항목으로 못박는다.
	 */
	it('이모지↔키워드 인덱스 정렬이 맞다 (:mahjong: → 🀄️)', () => {
		const results = searchEmojis('mahjong');
		expect(results[0]?.keyword).toBe(':mahjong:');
		expect(results[0]?.emoji).toBe('🀄️');
	});
});

describe('이모지 자동완성 · 판정 (findEmojiQuery)', () => {
	let editor: Editor;

	function createEditor(content: string, cursorAtEnd = true) {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit],
			content
		});
		if (cursorAtEnd) {
			editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		}
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	it('줄 시작의 `:query` 를 찾는다 — 지울 범위(from~to)까지', () => {
		createEditor('<p>:smi</p>');
		const match = findEmojiQuery(editor.state);
		expect(match).toEqual({ from: 1, to: 5, query: 'smi' });
	});

	it('공백 뒤의 `:` 도 트리거다', () => {
		createEditor('<p>hello :sm</p>');
		const match = findEmojiQuery(editor.state);
		expect(match?.query).toBe('sm');
		expect(match?.from).toBe(7);
	});

	it('`:` 만 친 상태는 빈 검색어로 잡는다', () => {
		createEditor('<p>:</p>');
		expect(findEmojiQuery(editor.state)?.query).toBe('');
	});

	it('단어에 붙은 콜론(`예: 값` 류)은 트리거가 아니다', () => {
		createEditor('<p>a:b</p>');
		expect(findEmojiQuery(editor.state)).toBeNull();
	});

	it('`::` 는 트리거가 아니다 (C++ 스코프 연산자)', () => {
		createEditor('<p>::x</p>');
		expect(findEmojiQuery(editor.state)).toBeNull();
	});

	it('검색어에 공백이 들어오면 판정이 끝난다', () => {
		createEditor('<p>:x y</p>');
		expect(findEmojiQuery(editor.state)).toBeNull();
	});

	it('`/` 로 시작하는 줄은 슬래시 메뉴 영역 — 안 띄운다', () => {
		createEditor('<p>/cmd :x</p>');
		expect(findEmojiQuery(editor.state)).toBeNull();
	});

	it('코드블록 안에서는 안 띄운다', () => {
		createEditor('<pre><code>:smi</code></pre>');
		expect(findEmojiQuery(editor.state)).toBeNull();
	});

	it('선택이 펼쳐져 있으면(드래그) 안 띄운다', () => {
		createEditor('<p>:smi</p>', false);
		editor.commands.setTextSelection({ from: 1, to: 3 });
		expect(findEmojiQuery(editor.state)).toBeNull();
	});

	it('삽입 흐름 — 판정한 범위를 지우고 이모지 + 공백이 남는다', () => {
		createEditor('<p>:smile</p>');
		const match = findEmojiQuery(editor.state);
		expect(match).not.toBeNull();
		const [{ emoji }] = searchEmojis(match!.query);
		editor
			.chain()
			.deleteRange({ from: match!.from, to: match!.to })
			.insertContent(`${emoji} `)
			.run();
		expect(editor.getText()).toBe(`${emoji} `);
	});
});

describe('이모지 자동완성 · 패턴 (EMOJI_QUERY_REGEX)', () => {
	it('허용/차단 꼴을 못박는다', () => {
		expect(EMOJI_QUERY_REGEX.test(':smi')).toBe(true);
		expect(EMOJI_QUERY_REGEX.test('말 뒤 :smi')).toBe(true);
		expect(EMOJI_QUERY_REGEX.test('word:smi')).toBe(false);
		expect(EMOJI_QUERY_REGEX.test('std::vector')).toBe(false);
		expect(EMOJI_QUERY_REGEX.test(':x 뒤공백')).toBe(false);
	});
});
