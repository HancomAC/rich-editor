import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
function createColumnContent(count) {
    const columns = [];
    for (let i = 0; i < count; i++) {
        columns.push({
            type: "column",
            content: [{ type: "paragraph" }],
        });
    }
    return columns;
}
export const Columns = TiptapNode.create({
    name: "columns",
    group: "block",
    content: "column{2,3}",
    defining: true,
    addAttributes() {
        return {
            columns: {
                default: 2,
                parseHTML: (element) => {
                    const attr = element.getAttribute("data-columns");
                    if (attr)
                        return parseInt(attr, 10) || 2;
                    // Legacy: count child columns
                    return element.children.length || 2;
                },
                renderHTML: (attributes) => ({
                    "data-columns": attributes.columns,
                }),
            },
        };
    },
    parseHTML() {
        return [
            { tag: 'div[data-type="columns"]' },
            { tag: "div.tiptap-columns" },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, { "data-type": "columns" }),
            0,
        ];
    },
    addCommands() {
        return {
            setColumns: (count = 2) => ({ chain }) => {
                return chain()
                    .insertContent({
                    type: this.name,
                    attrs: { columns: count },
                    content: createColumnContent(count),
                })
                    .run();
            },
            unsetColumns: () => ({ chain, state }) => {
                const { from } = state.selection;
                const node = state.doc.resolve(from);
                for (let d = node.depth; d > 0; d--) {
                    if (node.node(d).type.name === this.name) {
                        const pos = node.before(d);
                        const end = pos + node.node(d).nodeSize;
                        // Collect all text content from columns
                        const texts = [];
                        node.node(d).descendants((child) => {
                            if (child.isTextblock && child.textContent) {
                                texts.push(child.textContent);
                            }
                        });
                        return chain()
                            .deleteRange({ from: pos, to: end })
                            .insertContentAt(pos, texts.map((t) => `<p>${t}</p>`).join(""))
                            .run();
                    }
                }
                return false;
            },
        };
    },
    addKeyboardShortcuts() {
        return {
            // Tab in last column position should exit columns
            "Mod-Enter": () => {
                const { state } = this.editor;
                const { from } = state.selection;
                const resolved = state.doc.resolve(from);
                for (let d = resolved.depth; d > 0; d--) {
                    if (resolved.node(d).type.name === this.name) {
                        const after = resolved.after(d);
                        return this.editor
                            .chain()
                            .insertContentAt(after, { type: "paragraph" })
                            .focus(after + 1)
                            .run();
                    }
                }
                return false;
            },
            // Backspace at start of empty column: if all columns empty → unset
            Backspace: () => {
                const { state } = this.editor;
                const { from, empty } = state.selection;
                if (!empty)
                    return false;
                const resolved = state.doc.resolve(from);
                // Find columns ancestor
                let columnsDepth = -1;
                for (let d = resolved.depth; d > 0; d--) {
                    if (resolved.node(d).type.name === this.name) {
                        columnsDepth = d;
                        break;
                    }
                }
                if (columnsDepth === -1)
                    return false;
                // Must be at start of current textblock
                const parentOffset = resolved.parentOffset;
                if (parentOffset !== 0)
                    return false;
                // All columns must be empty
                const columnsNode = resolved.node(columnsDepth);
                let allEmpty = true;
                columnsNode.descendants((node) => {
                    if (node.isTextblock && node.textContent.length > 0) {
                        allEmpty = false;
                        return false;
                    }
                    return true;
                });
                if (!allEmpty)
                    return false;
                return this.editor.chain().focus().unsetColumns().run();
            },
        };
    },
});
