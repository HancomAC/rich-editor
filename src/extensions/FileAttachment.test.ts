import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FileAttachment } from './FileAttachment';

describe('FileAttachment extension', () => {
	let editor: Editor;

	function createEditor(content = '<p></p>') {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, FileAttachment],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	it('registers with name "fileAttachment"', () => {
		createEditor();
		const ext = editor.extensionManager.extensions.find(
			(e) => e.name === 'fileAttachment'
		);
		expect(ext).toBeDefined();
	});

	it('parses <div data-file-id="123">', () => {
		createEditor(
			'<div data-file-id="123" data-file-name="test.pdf"></div>'
		);
		const doc = editor.getJSON();
		const fileNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'fileAttachment'
		);
		expect(fileNode).toBeDefined();
		expect(fileNode?.attrs?.fileId).toBe('123');
		expect(fileNode?.attrs?.name).toBe('test.pdf');
	});

	it('parses <div data-file-src="url">', () => {
		createEditor(
			'<div data-file-src="https://example.com/file.zip" data-file-name="file.zip"></div>'
		);
		const doc = editor.getJSON();
		const fileNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'fileAttachment'
		);
		expect(fileNode).toBeDefined();
		expect(fileNode?.attrs?.src).toBe('https://example.com/file.zip');
		expect(fileNode?.attrs?.name).toBe('file.zip');
	});

	it('renders HTML with correct attributes', () => {
		createEditor();
		editor.commands.setFileAttachment({
			src: 'https://example.com/file.zip',
			name: 'file.zip',
			size: 1024
		});
		const html = editor.getHTML();
		expect(html).toContain('data-file-src="https://example.com/file.zip"');
		expect(html).toContain('data-file-name="file.zip"');
		expect(html).toContain('data-file-size="1024"');
	});

	it('uses default name when name is missing', () => {
		createEditor('<div data-file-id="456"></div>');
		const doc = editor.getJSON();
		const fileNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'fileAttachment'
		);
		expect(fileNode?.attrs?.name).toBe('파일');
	});

	it('parses file size as number', () => {
		createEditor(
			'<div data-file-id="789" data-file-size="2048"></div>'
		);
		const doc = editor.getJSON();
		const fileNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'fileAttachment'
		);
		expect(fileNode?.attrs?.size).toBe(2048);
	});
});
