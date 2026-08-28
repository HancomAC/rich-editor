import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { PdfBlock } from './PdfBlock';

describe('PdfBlock extension', () => {
	let editor: Editor;

	function createEditor(content = '<p></p>') {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, PdfBlock],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	it('registers with name "pdfBlock"', () => {
		createEditor();
		const ext = editor.extensionManager.extensions.find(
			(e) => e.name === 'pdfBlock'
		);
		expect(ext).toBeDefined();
	});

	it('parses <div data-pdf-src="url">', () => {
		createEditor(
			'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>'
		);
		const doc = editor.getJSON();
		const pdfNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'pdfBlock'
		);
		expect(pdfNode).toBeDefined();
		expect(pdfNode?.attrs?.src).toBe('https://example.com/doc.pdf');
		expect(pdfNode?.attrs?.name).toBe('doc.pdf');
	});

	it('parses <div data-pdf-id="123">', () => {
		createEditor(
			'<div data-pdf-id="123" data-pdf-name="report.pdf"></div>'
		);
		const doc = editor.getJSON();
		const pdfNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'pdfBlock'
		);
		expect(pdfNode).toBeDefined();
		expect(pdfNode?.attrs?.fileId).toBe('123');
		expect(pdfNode?.attrs?.name).toBe('report.pdf');
	});

	it('renders correct HTML with src', () => {
		createEditor(
			'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>'
		);
		const html = editor.getHTML();
		expect(html).toContain('data-pdf-src="https://example.com/doc.pdf"');
		expect(html).toContain('data-pdf-name="doc.pdf"');
	});

	it('leaves label null and omits the attribute for legacy HTML', () => {
		createEditor(
			'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>'
		);
		const pdfNode = editor
			.getJSON()
			.content?.find((n: Record<string, unknown>) => n.type === 'pdfBlock');
		expect(pdfNode?.attrs?.label).toBeNull();
		// 값이 없으면 속성을 아예 뺀다 — 옛 문서와 출력이 구분되지 않아야 한다.
		expect(editor.getHTML()).not.toContain('data-pdf-label');
	});

	it('round-trips label through parse → render → parse', () => {
		createEditor(
			'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf" data-pdf-label="1강 자료"></div>'
		);
		const html = editor.getHTML();
		expect(html).toContain('data-pdf-label="1강 자료"');
		// 다운로드에 쓰이는 실제 파일명은 그대로 살아 있어야 한다.
		expect(html).toContain('data-pdf-name="doc.pdf"');

		createEditor(html);
		const pdfNode = editor
			.getJSON()
			.content?.find((n: Record<string, unknown>) => n.type === 'pdfBlock');
		expect(pdfNode?.attrs?.label).toBe('1강 자료');
		expect(pdfNode?.attrs?.name).toBe('doc.pdf');
	});

	it('keeps the width attribute a preset button would set', () => {
		createEditor(
			'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-width="50%"></div>'
		);
		const pdfNode = editor
			.getJSON()
			.content?.find((n: Record<string, unknown>) => n.type === 'pdfBlock');
		expect(pdfNode?.attrs?.width).toBe('50%');
		expect(editor.getHTML()).toContain('data-pdf-width="50%"');
	});

	it('uses default name "PDF" when name is missing', () => {
		createEditor('<div data-pdf-src="https://example.com/x.pdf"></div>');
		const doc = editor.getJSON();
		const pdfNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'pdfBlock'
		);
		expect(pdfNode?.attrs?.name).toBe('PDF');
	});

	/*
	 * 조작부는 판 위에 얹혀 있고, 위아래 바는 없다. 여기 있는 단언들은 전부 한 번씩
	 * 잘못 만들었다가 되돌린 것들이라 그대로 못으로 박아 둔다.
	 */
	describe('node view — 판 위 조작부', () => {
		const PDF_HTML =
			'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>';

		function mount(html = PDF_HTML, editable = true) {
			const element = document.createElement('div');
			document.body.appendChild(element);
			editor = new Editor({
				element,
				editable,
				extensions: [StarterKit, PdfBlock],
				content: html
			});
			const frame = element.querySelector('.pdf-frame') as HTMLElement;
			const overlay = element.querySelector('.pdf-overlay') as HTMLElement;
			return { element, frame, overlay };
		}

		it('renders no header or footer bar — only the plate', () => {
			const { frame } = mount();
			expect(frame).toBeTruthy();
			// 캔버스 · 상태문구 · 조작부. 바가 다시 생기면 여기서 걸린다.
			const kinds = [...frame.children].map((c) =>
				c.tagName === 'CANVAS' ? 'canvas' : c.className
			);
			expect(kinds).toEqual(['canvas', 'pdf-status', 'pdf-overlay']);
		});

		it('gives editors the name box, the width presets and delete', () => {
			const { overlay } = mount();
			expect(overlay.querySelector('input.pdf-name')).toBeTruthy();
			expect(
				[...overlay.querySelectorAll('.pdf-preset')].map((b) => b.textContent)
			).toEqual(['50', '75', '100']);
			expect(overlay.querySelector('.pdf-ctl-danger')).toBeTruthy();
		});

		it('hides authoring controls from readers but keeps the file actions', () => {
			const { overlay } = mount(PDF_HTML, false);
			// 저장되는 문서 속성을 읽는 사람이 건드릴 자리는 없다.
			expect(overlay.querySelector('input.pdf-name')).toBeNull();
			expect(overlay.querySelector('.pdf-preset')).toBeNull();
			expect(overlay.querySelector('.pdf-ctl-danger')).toBeNull();
			// 이름은 남는다 — 없으면 `label` 속성이 편집 화면 전용 값이 돼 버린다.
			expect(overlay.querySelector('.pdf-cluster-start')?.textContent).toBe(
				'doc.pdf'
			);
			expect(overlay.querySelectorAll('a.pdf-ctl').length).toBe(2);
		});

		it('shows the label instead of the file name when one is set', () => {
			const { overlay } = mount(
				'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf" data-pdf-label="1강 자료"></div>',
				false
			);
			expect(overlay.querySelector('.pdf-cluster-start')?.textContent).toBe(
				'1강 자료'
			);
		});

		it('marks the width preset that matches the current width', () => {
			const { overlay } = mount(
				'<div data-pdf-src="https://example.com/doc.pdf" data-pdf-width="75%"></div>'
			);
			const active = overlay.querySelector('.pdf-preset.is-active');
			expect(active?.textContent).toBe('75');
			expect(active?.getAttribute('aria-pressed')).toBe('true');
		});

		it('writes the width attribute when a preset is clicked', () => {
			const { overlay } = mount();
			const presets = [...overlay.querySelectorAll('.pdf-preset')];
			(presets[0] as HTMLButtonElement).click();
			const pdfNode = editor
				.getJSON()
				.content?.find((n: Record<string, unknown>) => n.type === 'pdfBlock');
			expect(pdfNode?.attrs?.width).toBe('50%');
		});

		it('removes the block when delete is clicked', () => {
			const { overlay } = mount();
			(overlay.querySelector('.pdf-ctl-danger') as HTMLButtonElement).click();
			const hasPdf = editor
				.getJSON()
				.content?.some((n: Record<string, unknown>) => n.type === 'pdfBlock');
			expect(hasPdf).toBeFalsy();
		});

		/*
		 * ⚠️ 넘김 버튼이 판 가장자리에 붙으면 폭 조절 손잡이(`right: -12px`, 높이 전체)를
		 * 가려 리사이즈가 통째로 죽는다. 들여쓰기는 CSS 에 있으므로 여기서는 **그 CSS 가
		 * 걸리는 클래스가 실제로 붙는지**를 지킨다.
		 */
		it('keeps the page arrows away from the resize handle', () => {
			const { overlay } = mount();
			// 아직 문서를 못 읽었으므로 붙어 있지 않다 — 한 장짜리에 누를 수 없는
			// 화살표가 남는 것을 막는 것도 같은 규칙이다.
			expect(overlay.querySelector('.pdf-nav')).toBeNull();

			// 손잡이는 `right: -12px` 에 `width: 14px` 이라 판 안쪽 2px 을 먹는다.
			// 들여쓰기가 그보다 작아지면 리사이즈가 죽으므로 값 자체를 지킨다.
			const css = readFileSync('src/styles/editor.css', 'utf-8');
			const inset = (rule: string) =>
				Number(
					css.match(new RegExp(`\\.${rule}\\s*\\{[^}]*?(\\d+)px`))?.[1] ?? '0'
				);
			expect(inset('pdf-nav-prev')).toBeGreaterThanOrEqual(12);
			expect(inset('pdf-nav-next')).toBeGreaterThanOrEqual(12);
		});
	});
});
