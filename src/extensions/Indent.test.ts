import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Indent } from './Indent';

describe('Indent extension', () => {
	let editor: Editor;

	function createEditor(content = '<p>Hello</p>') {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, Indent],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	it('registers with name "indent"', () => {
		createEditor();
		const ext = editor.extensionManager.extensions.find(
			(e) => e.name === 'indent'
		);
		expect(ext).toBeDefined();
	});

	it('indent command increases indent level', () => {
		createEditor('<p>Test</p>');
		editor.commands.indent();
		const doc = editor.getJSON();
		const para = doc.content?.[0];
		expect(para?.attrs?.indent).toBe(1);
	});

	it('outdent command decreases indent level', () => {
		createEditor('<p>Test</p>');
		editor.commands.indent();
		editor.commands.indent();
		editor.commands.outdent();
		const doc = editor.getJSON();
		const para = doc.content?.[0];
		expect(para?.attrs?.indent).toBe(1);
	});

	it('does not outdent below 0', () => {
		createEditor('<p>Test</p>');
		const result = editor.commands.outdent();
		expect(result).toBe(false);
		const doc = editor.getJSON();
		const para = doc.content?.[0];
		expect(para?.attrs?.indent ?? 0).toBe(0);
	});

	it('does not indent above MAX_INDENT (8)', () => {
		createEditor('<p>Test</p>');
		for (let i = 0; i < 10; i++) {
			editor.commands.indent();
		}
		const doc = editor.getJSON();
		const para = doc.content?.[0];
		expect(para?.attrs?.indent).toBe(8);
	});

	it('renders margin-left style in HTML', () => {
		createEditor('<p>Test</p>');
		editor.commands.indent();
		editor.commands.indent();
		const html = editor.getHTML();
		// 2 levels * 2em = 4em
		expect(html).toContain('margin-left: 4em');
	});

	it('parses margin-left from existing HTML (px)', () => {
		// 40px = 1 indent level (Math.round(40/40) = 1)
		createEditor('<p style="margin-left: 40px">Indented</p>');
		const doc = editor.getJSON();
		const para = doc.content?.[0];
		expect(para?.attrs?.indent).toBe(1);
	});

	it('parses margin-left from existing HTML (em)', () => {
		// 4em / 2em step = 2 indent levels
		createEditor('<p style="margin-left: 4em">Indented</p>');
		const doc = editor.getJSON();
		const para = doc.content?.[0];
		expect(para?.attrs?.indent).toBe(2);
	});
});
