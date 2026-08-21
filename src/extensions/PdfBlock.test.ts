import { describe, it, expect, afterEach } from 'vitest';
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
});
