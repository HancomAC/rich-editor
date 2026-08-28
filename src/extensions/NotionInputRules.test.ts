import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { DetailsContent } from '@tiptap/extension-details';
import { FixedDetails } from './FixedDetails';
import {
	NotionBlockquote,
	LeveledDetailsSummary,
	NotionToggleInputRule,
	BLOCKQUOTE_INPUT_REGEX,
	TOGGLE_INPUT_REGEX
} from './NotionInputRules';

/*
 * 토글·토글 제목은 **커서가 어디 남는지**가 곧 사용성이다. 만들어졌는지만 보면
 * "토글은 생겼는데 이어 친 글자가 엉뚱한 데 들어가는" 상태를 놓친다 — 실제로 그랬다.
 * 그래서 노드 구조와 selection 을 **함께** 단언한다.
 */
describe('노션식 입력 규칙 · 토글 제목', () => {
	let editor: Editor;

	function createEditor(content = '<p></p>') {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [
				StarterKit.configure({ blockquote: false }),
				NotionBlockquote,
				FixedDetails,
				DetailsContent,
				LeveledDetailsSummary,
				NotionToggleInputRule
			],
			content
		});
		return editor;
	}

	interface JSONNode {
		type?: string;
		attrs?: Record<string, unknown>;
		text?: string;
		content?: JSONNode[];
	}
	const json = (): JSONNode => editor.getJSON() as unknown as JSONNode;
	const firstBlock = () => json().content?.[0];

	afterEach(() => {
		editor?.destroy();
	});

	describe('setToggleHeading', () => {
		it('빈 문단에서 토글을 만들고 커서를 제목 칸에 둔다', () => {
			createEditor();
			editor.commands.setToggleHeading(0);

			const details = firstBlock();
			expect(details?.type).toBe('details');
			expect(details?.content?.[0].type).toBe('detailsSummary');

			/*
			 * ⚠️ 핵심 단언. 커서가 제목 칸(`detailsSummary`) 안에 있어야 이어서 친 글자가
			 * 토글 제목이 된다. 예전 구현(`setDetails` → `updateAttributes`)에서는 여기서
			 * 커서가 토글 **바깥**으로 밀려 글자가 아래 문단에 들어갔다.
			 */
			const { $from } = editor.state.selection;
			expect($from.parent.type.name).toBe('detailsSummary');
		});

		it('이어서 친 글자가 제목 칸에 들어간다', () => {
			createEditor();
			editor.commands.setToggleHeading(1);
			editor.commands.insertContent('접히는 제목');

			const summary = firstBlock()?.content?.[0];
			expect(summary?.type).toBe('detailsSummary');
			expect(summary?.content?.[0].text).toBe('접히는 제목');
		});

		it('단계를 detailsSummary 의 level 로 남긴다', () => {
			createEditor();
			editor.commands.setToggleHeading(2);
			expect(firstBlock()?.content?.[0].attrs?.level).toBe(2);
		});

		it('level 0 이면 data-level 을 아예 내보내지 않는다(옛 문서와 같은 모양)', () => {
			createEditor();
			editor.commands.setToggleHeading(0);
			expect(editor.getHTML()).not.toContain('data-level');
		});

		it('level 1 은 data-level="1" 로 저장된다', () => {
			createEditor();
			editor.commands.setToggleHeading(1);
			expect(editor.getHTML()).toContain('data-level="1"');
		});

		/*
		 * ⚠️ 제목 위에서 부르면 제목이 **본문으로 눕혀져** 안에 들어가야 한다.
		 * 제목인 채로 들어가면 큰 글자가 접힌 안쪽에 숨고 토글 머리는 빈 줄이 된다.
		 */
		it('제목 위에서 부르면 제목을 문단으로 눕혀 안에 넣는다', () => {
			createEditor('<h1>원래 제목</h1>');
			editor.commands.selectAll();
			editor.commands.setToggleHeading(1);

			const details = firstBlock();
			const inner = details?.content?.[1];
			expect(inner?.type).toBe('detailsContent');
			expect(inner?.content?.[0].type).toBe('paragraph');
			expect(inner?.content?.[0].content?.[0].text).toBe('원래 제목');
		});

		it('옛 문서의 토글(data-level 없음)은 level 0 으로 읽힌다', () => {
			createEditor('<details><summary>옛 토글</summary><div>본문</div></details>');
			expect(firstBlock()?.content?.[0].attrs?.level).toBe(0);
		});
	});

	describe('인용문 입력 규칙', () => {
		it('StarterKit 의 `> ` 대신 `" ` 가 인용문을 만든다', () => {
			createEditor();
			// 입력 규칙은 실제 타이핑에만 걸리므로 명령으로 대신 확인한다.
			editor.commands.toggleBlockquote();
			expect(firstBlock()?.type).toBe('blockquote');
		});

		/*
		 * ⚠️ **두 규칙이 같은 키를 노리면 안 된다.** `> ` 가 인용문에도 남아 있으면 어느
		 * 쪽이 이길지 확장 등록 순서에 달리게 되어, 같은 키를 쳤는데 결과가 갈린다.
		 * 그래서 겹치지 않는지를 정규식 수준에서 못박는다.
		 */
		it('`>` 는 토글만, `"` 는 인용문만 받는다 (서로 겹치지 않는다)', () => {
			expect(TOGGLE_INPUT_REGEX.test('> ')).toBe(true);
			expect(BLOCKQUOTE_INPUT_REGEX.test('> ')).toBe(false);

			expect(BLOCKQUOTE_INPUT_REGEX.test('" ')).toBe(true);
			expect(TOGGLE_INPUT_REGEX.test('" ')).toBe(false);
		});

		/*
		 * `Typography` 가 `"` 를 여는 따옴표로 먼저 바꾸므로, 곧은 따옴표만 찾으면
		 * 규칙이 영영 안 걸린다.
		 */
		it('스마트 따옴표(“)도 인용문으로 받는다', () => {
			expect(BLOCKQUOTE_INPUT_REGEX.test('“ ')).toBe(true);
		});
	});
});
