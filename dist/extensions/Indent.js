import { Extension } from "@tiptap/core";
const INDENT_STEP = 2; // em per level
const MAX_INDENT = 8;
export const Indent = Extension.create({
    name: "indent",
    addGlobalAttributes() {
        return [
            {
                types: ["paragraph", "heading"],
                attributes: {
                    indent: {
                        default: 0,
                        parseHTML: (element) => {
                            const ml = element.style.marginLeft;
                            if (!ml)
                                return 0;
                            return Math.round(parseFloat(ml) / INDENT_STEP) || 0;
                        },
                        renderHTML: (attributes) => {
                            if (!attributes.indent || attributes.indent <= 0)
                                return {};
                            return { style: `margin-left: ${attributes.indent * INDENT_STEP}em` };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            indent: () => ({ tr, state, dispatch }) => {
                const { $from } = state.selection;
                // listItem 내부에서는 기존 리스트 동작에 위임
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === "listItem")
                        return false;
                }
                const node = $from.parent;
                if (node.type.name !== "paragraph" && node.type.name !== "heading")
                    return false;
                const pos = $from.before($from.depth);
                const currentIndent = node.attrs.indent || 0;
                if (currentIndent >= MAX_INDENT)
                    return false;
                if (dispatch) {
                    tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        indent: currentIndent + 1,
                    });
                    dispatch(tr);
                }
                return true;
            },
            outdent: () => ({ tr, state, dispatch }) => {
                const { $from } = state.selection;
                for (let d = $from.depth; d > 0; d--) {
                    if ($from.node(d).type.name === "listItem")
                        return false;
                }
                const node = $from.parent;
                if (node.type.name !== "paragraph" && node.type.name !== "heading")
                    return false;
                const pos = $from.before($from.depth);
                const currentIndent = node.attrs.indent || 0;
                if (currentIndent <= 0)
                    return false;
                if (dispatch) {
                    tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        indent: currentIndent - 1,
                    });
                    dispatch(tr);
                }
                return true;
            },
        };
    },
    addKeyboardShortcuts() {
        return {
            Tab: () => this.editor.commands.indent(),
            "Shift-Tab": () => this.editor.commands.outdent(),
        };
    },
});
