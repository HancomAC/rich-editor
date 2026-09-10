import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TiptapMidibus } from './TiptapMidibus';
import { sanitizeHtml, transformLegacyHtml } from '../utils/sanitize';

/**
 * 이 노드의 계약은 **재생이 아니라 보존**이다. 정올 prod 와 lms 는 같은 Datastore 를
 * 쓰므로, lms 에서 열었다 저장하는 것만으로 바이트가 달라지면 prod 쪽 렌더가 깨진다.
 * 그래서 여기 테스트는 전부 "넣은 것이 그대로 나오는가" 를 본다.
 */
describe('TiptapMidibus — prod 저장 형식 왕복', () => {
	let editor: Editor;

	function createEditor(content: string) {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, TiptapMidibus],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	/* prod `midibus/index.ts` 의 `renderHTML` 이 실제로 뱉는 꼴. 속성 순서까지 그대로다. */
	const PROD =
		'<tiptap-midibus id="abc123" start="0" uuid="abc123" width="100%" height="600" data-bubble-menu="false"></tiptap-midibus>';

	it('prod 저장본을 노드로 읽는다', () => {
		createEditor(PROD);
		const doc = editor.getJSON();
		const node = doc.content?.[0];
		expect(node?.type).toBe('tiptapMidibus');
		expect(node?.attrs?.id).toBe('abc123');
		expect(node?.attrs?.uuid).toBe('abc123');
	});

	it('왕복에서 바이트가 그대로다', () => {
		createEditor(PROD);
		expect(editor.getHTML()).toBe(PROD);
	});

	it('앞뒤 본문이 있어도 그대로다', () => {
		const html = `<p>앞</p>${PROD}<p>뒤</p>`;
		createEditor(html);
		expect(editor.getHTML()).toBe(html);
	});

	/*
	 * ⚠️ 회귀 표적. 예전엔 이 태그를 아는 노드가 없어 파서가 통째로 버렸고, 실제로
	 * 강의영상 글이 lms 에서 `<p>` 하나만 남고 비었다.
	 */
	it('노드가 없으면 사라진다는 것을 함께 박아 둔다', () => {
		const bare = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit],
			content: PROD
		});
		expect(bare.getHTML()).not.toContain('tiptap-midibus');
		bare.destroy();
	});

	it('모르는 속성도 잃지 않는다', () => {
		const html =
			'<tiptap-midibus id="v" start="12" uuid="u" width="100%" height="600" data-bubble-menu="false" data-resize-aspect-ratio="1.777"></tiptap-midibus>';
		createEditor(html);
		expect(editor.getHTML()).toBe(html);
	});

	it('속성 순서가 prod 와 달라도 그 순서 그대로 되쓴다', () => {
		const html = '<tiptap-midibus height="400" id="v" uuid="u"></tiptap-midibus>';
		createEditor(html);
		expect(editor.getHTML()).toBe(html);
	});

	it('on* 은 되쓰지 않는다', () => {
		createEditor('<tiptap-midibus id="v" onload="alert(1)"></tiptap-midibus>');
		expect(editor.getHTML()).toBe('<tiptap-midibus id="v"></tiptap-midibus>');
	});

	it('새로 넣으면 prod 와 같은 꼴로 저장된다', () => {
		createEditor('<p></p>');
		editor.commands.setTiptapMidibus({ id: 'new1', start: 30, uuid: 'new1' });
		expect(editor.getHTML()).toContain(
			'<tiptap-midibus id="new1" start="30" uuid="new1" width="100%" height="600" data-bubble-menu="false">'
		);
	});

	it('transformLegacyHtml 은 이 태그를 건드리지 않는다', () => {
		expect(transformLegacyHtml(PROD)).toBe(PROD);
	});

	/*
	 * ⚠️ 정적 렌더(`{@html}` + 살균) 경로. 살균의 태그 이름 패턴에 하이픈이 없어서
	 * 허용 목록에 `tiptap-midibus` 가 적혀 있는데도 통째로 지워지고 있었다.
	 */
	it('sanitizeHtml 을 통과한다', () => {
		const clean = sanitizeHtml(PROD);
		expect(clean).toContain('<tiptap-midibus');
		expect(clean).toContain('id="abc123"');
		expect(clean).toContain('data-bubble-menu="false"');
		expect(clean).toContain('</tiptap-midibus>');
	});
});
