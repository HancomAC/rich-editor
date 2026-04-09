import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Columns } from './Columns';
import { Column } from './Column';
describe('Columns extension', () => {
    let editor;
    function createEditor(content = '<p></p>') {
        editor = new Editor({
            element: document.createElement('div'),
            extensions: [StarterKit, Columns, Column],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    it('Columns extension name is "columns"', () => {
        createEditor();
        const ext = editor.extensionManager.extensions.find((e) => e.name === 'columns');
        expect(ext).toBeDefined();
    });
    it('Column extension name is "column"', () => {
        createEditor();
        const ext = editor.extensionManager.extensions.find((e) => e.name === 'column');
        expect(ext).toBeDefined();
    });
    it('creates 2-column layout via command', () => {
        createEditor();
        editor.commands.setColumns(2);
        const doc = editor.getJSON();
        const columnsNode = doc.content?.find((n) => n.type === 'columns');
        expect(columnsNode).toBeDefined();
        expect(columnsNode?.attrs?.columns).toBe(2);
        expect(columnsNode?.content).toHaveLength(2);
        expect(columnsNode?.content?.[0]?.type).toBe('column');
    });
    it('creates 3-column layout via command', () => {
        createEditor();
        editor.commands.setColumns(3);
        const doc = editor.getJSON();
        const columnsNode = doc.content?.find((n) => n.type === 'columns');
        expect(columnsNode).toBeDefined();
        expect(columnsNode?.attrs?.columns).toBe(3);
        expect(columnsNode?.content).toHaveLength(3);
    });
    it('parses <div data-type="columns"> HTML', () => {
        createEditor('<div data-type="columns"><div data-type="column"><p>A</p></div><div data-type="column"><p>B</p></div></div>');
        const doc = editor.getJSON();
        const columnsNode = doc.content?.find((n) => n.type === 'columns');
        expect(columnsNode).toBeDefined();
        expect(columnsNode?.content).toHaveLength(2);
    });
    it('renders HTML with data-type="columns"', () => {
        createEditor();
        editor.commands.setColumns(2);
        const html = editor.getHTML();
        expect(html).toContain('data-type="columns"');
        expect(html).toContain('data-type="column"');
    });
});
