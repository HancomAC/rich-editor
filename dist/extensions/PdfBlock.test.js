import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { PdfBlock } from './PdfBlock';
describe('PdfBlock extension', () => {
    let editor;
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
        const ext = editor.extensionManager.extensions.find((e) => e.name === 'pdfBlock');
        expect(ext).toBeDefined();
    });
    it('parses <div data-pdf-src="url">', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>');
        const doc = editor.getJSON();
        const pdfNode = doc.content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode).toBeDefined();
        expect(pdfNode?.attrs?.src).toBe('https://example.com/doc.pdf');
        expect(pdfNode?.attrs?.name).toBe('doc.pdf');
    });
    it('parses <div data-pdf-id="123">', () => {
        createEditor('<div data-pdf-id="123" data-pdf-name="report.pdf"></div>');
        const doc = editor.getJSON();
        const pdfNode = doc.content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode).toBeDefined();
        expect(pdfNode?.attrs?.fileId).toBe('123');
        expect(pdfNode?.attrs?.name).toBe('report.pdf');
    });
    it('renders correct HTML with src', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-pdf-src="https://example.com/doc.pdf"');
        expect(html).toContain('data-pdf-name="doc.pdf"');
    });
    it('uses default name "PDF" when name is missing', () => {
        createEditor('<div data-pdf-src="https://example.com/x.pdf"></div>');
        const doc = editor.getJSON();
        const pdfNode = doc.content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode?.attrs?.name).toBe('PDF');
    });
});
