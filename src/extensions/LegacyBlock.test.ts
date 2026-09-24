import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { LegacyBlock, type LegacyBlockKind, type LegacyBlockRenderer } from './LegacyBlock';
import { Columns } from './Columns';
import { Column } from './Column';
import { sanitizeHtml, transformLegacyHtml } from '../utils/sanitize';

/**
 * 옛 블록 셋은 **편집하지 않고 보존한다.** 정올 prod 와 lms 가 같은 Datastore 를 쓰므로,
 * 형식을 갈아 끼우면 lms 에서는 보이고 prod 에서는 사라진다 — 손해가 반대로 옮겨갈 뿐이다.
 */
describe('LegacyBlock — 옛 정올 블록 보존', () => {
	let editor: Editor;

	function createEditor(content: string) {
		editor = new Editor({
			element: document.createElement('div'),
			// `Columns`/`Column` 도 함께 넣는다 — 셀렉터가 겹치므로 우선순위를 실제로 확인해야 한다.
			extensions: [StarterKit, LegacyBlock, Columns, Column],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	const YOUTUBE = '<lite-youtube videoid="dQw4w9WgXcQ" params="rel=0"></lite-youtube>';
	/*
	 * ⚠️ 값 없는 속성(`allowfullscreen`)은 `getHTML()` 이 DOM 을 거치며 `=""` 로 정규화된다.
	 * prod 저장본도 같은 경로(`getHTML()`)로 만들어져 이미 `=""` 꼴이라 실사용에서는 어긋나지
	 * 않는다 — 그래서 표본도 `=""` 로 적는다.
	 */
	const IFRAME =
		'<div class="iframe-wrapper"><iframe src="https://jungol.co.kr/embed/1" width="640" height="360" frameborder="0" allowfullscreen=""></iframe></div>';
	const COLUMNS =
		'<div class="tiptap-columns"><div class="tiptap-column"><p>왼쪽</p></div><div class="tiptap-column"><p>오른쪽</p></div></div>';

	it('lite-youtube 를 왕복에서 바이트 보존한다', () => {
		createEditor(YOUTUBE);
		expect(editor.getJSON().content?.[0]?.type).toBe('legacyBlock');
		expect(editor.getHTML()).toBe(YOUTUBE);
	});

	it('div.iframe-wrapper 를 왕복에서 바이트 보존한다', () => {
		createEditor(IFRAME);
		expect(editor.getHTML()).toBe(IFRAME);
	});

	/* ⚠️ `Columns` 의 같은 셀렉터(우선순위 50)보다 먼저 잡혀야 한다. */
	it('div.tiptap-columns 를 Columns 보다 먼저 잡아 원본 그대로 되쓴다', () => {
		createEditor(COLUMNS);
		const node = editor.getJSON().content?.[0];
		expect(node?.type).toBe('legacyBlock');
		expect(node?.attrs?.kind).toBe('columns');
		expect(editor.getHTML()).toBe(COLUMNS);
	});

	it('rich-editor 자신의 단(div[data-type="columns"])은 그대로 Columns 가 맡는다', () => {
		createEditor(
			'<div data-type="columns"><div data-type="column"><p>A</p></div><div data-type="column"><p>B</p></div></div>'
		);
		expect(editor.getJSON().content?.[0]?.type).toBe('columns');
	});

	it('앞뒤 본문이 섞여도 셋 다 그대로다', () => {
		const html = `<p>앞</p>${YOUTUBE}${IFRAME}${COLUMNS}<p>뒤</p>`;
		createEditor(html);
		expect(editor.getHTML()).toBe(html);
	});

	/* ⚠️ 회귀 표적. 노드가 없으면 파서가 통째로 버린다. */
	it('노드가 없으면 세 블록이 전부 사라진다는 것을 함께 박아 둔다', () => {
		const bare = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit],
			content: YOUTUBE + IFRAME
		});
		const html = bare.getHTML();
		expect(html).not.toContain('lite-youtube');
		expect(html).not.toContain('iframe');
		bare.destroy();
	});

	it('on* 은 되쓰지 않는다', () => {
		createEditor('<lite-youtube videoid="v" onerror="alert(1)"></lite-youtube>');
		expect(editor.getHTML()).toBe('<lite-youtube videoid="v"></lite-youtube>');
	});

	it('transformLegacyHtml 이 옛 단을 더는 갈아 끼우지 않는다', () => {
		// 갈아 끼우면 prod 가 모르는 형식으로 저장돼 이번엔 prod 쪽에서 단이 사라진다.
		expect(transformLegacyHtml(COLUMNS)).toBe(COLUMNS);
	});

	describe('sanitizeHtml', () => {
		it('세 블록을 정적 렌더에서도 살려 둔다', () => {
			const clean = sanitizeHtml(YOUTUBE + IFRAME + COLUMNS);
			expect(clean).toContain('<lite-youtube');
			expect(clean).toContain('videoid="dQw4w9WgXcQ"');
			expect(clean).toContain('<iframe');
			expect(clean).toContain('src="https://jungol.co.kr/embed/1"');
			expect(clean).toContain('class="tiptap-columns"');
		});

		it('허용하지 않은 호스트의 iframe 은 src 를 뗀다', () => {
			const clean = sanitizeHtml('<iframe src="https://evil.example/x"></iframe>');
			expect(clean).toContain('<iframe');
			expect(clean).not.toContain('evil.example');
		});
	});

	/*
	 * 호스트 렌더러 주입(정올 lms 는 `youtube` 만 그리고 나머지는 사양한다).
	 * **화면만 바뀌고 저장 바이트는 그대로여야 한다.**
	 */
	describe('renderer 주입', () => {
		function createWithRenderer(content: string, renderer: LegacyBlockRenderer) {
			editor = new Editor({
				element: document.createElement('div'),
				extensions: [StarterKit, LegacyBlock.configure({ renderer }), Columns, Column],
				content
			});
			return editor;
		}

		/** lms 가 실제로 쓰는 모양 — 유튜브만 그리고 나머지는 자리표시자에 맡긴다. */
		const youtubeOnly: LegacyBlockRenderer = ({ element, kind, spec }) => {
			if (kind !== 'youtube') return false;
			const videoid = spec?.[1]?.videoid ?? '';
			element.innerHTML = `<div class="yt" data-videoid="${videoid}"></div>`;
		};

		it('셋을 함께 넣어도 왕복 바이트가 그대로다', () => {
			const html = YOUTUBE + IFRAME + COLUMNS;
			createWithRenderer(html, youtubeOnly);
			expect(editor.getHTML()).toBe(html);
		});

		it('유튜브만 실물이 서고 나머지는 자리표시자다', () => {
			createWithRenderer(YOUTUBE + IFRAME + COLUMNS, youtubeOnly);
			const blocks = Array.from(editor.view.dom.querySelectorAll('[data-type="legacyBlock"]'));
			const byKind = (kind: LegacyBlockKind) =>
				blocks.find((el) => el.getAttribute('data-legacy-kind') === kind);

			expect(byKind('youtube')?.querySelector('.yt')?.getAttribute('data-videoid')).toBe(
				'dQw4w9WgXcQ'
			);
			expect(byKind('youtube')?.textContent).not.toContain('편집 불가');
			expect(byKind('iframe')?.textContent).toContain('임베드 (옛 형식 · 편집 불가)');
			expect(byKind('columns')?.textContent).toContain('단 나누기 (옛 형식 · 편집 불가)');
		});

		it('렌더러가 던져도 자리표시자로 살아남고 바이트도 그대로다', () => {
			createWithRenderer(YOUTUBE, () => {
				throw new Error('host boom');
			});
			expect(editor.view.dom.textContent).toContain('유튜브 영상 (옛 형식 · 편집 불가)');
			expect(editor.getHTML()).toBe(YOUTUBE);
		});

		it('노드가 사라지면 치울 함수가 불린다', () => {
			let destroyed = 0;
			createWithRenderer(YOUTUBE, () => () => {
				destroyed += 1;
			});
			editor.commands.setContent('<p>비움</p>');
			expect(destroyed).toBe(1);
		});
	});
});
