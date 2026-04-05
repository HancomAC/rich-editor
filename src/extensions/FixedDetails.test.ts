import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FixedDetails } from './FixedDetails';
import DetailsSummary from '@tiptap/extension-details-summary';
import DetailsContent from '@tiptap/extension-details-content';

describe('FixedDetails extension', () => {
	let editor: Editor;

	function createEditor(content = '<p></p>') {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [StarterKit, FixedDetails, DetailsSummary, DetailsContent],
			content
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	it('registers with name "details"', () => {
		createEditor();
		const ext = editor.extensionManager.extensions.find(
			(e) => e.name === 'details'
		);
		expect(ext).toBeDefined();
	});

	it('parses <details><summary> HTML', () => {
		createEditor(
			'<details><summary>Title</summary><div>Content here</div></details>'
		);
		const doc = editor.getJSON();
		const detailsNode = doc.content?.find(
			(n: Record<string, unknown>) => n.type === 'details'
		);
		expect(detailsNode).toBeDefined();
	});

	it('renders HTML containing details structure', () => {
		createEditor(
			'<details><summary>Title</summary><div>Content</div></details>'
		);
		const html = editor.getHTML();
		// FixedDetails uses addNodeView which outputs <details> tag,
		// but getHTML() uses renderHTML from the parent Details extension
		// which outputs native <details> element
		expect(html).toContain('<details>');
		expect(html).toContain('<summary>');
	});
});
