import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

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
              if (!ml) return 0;
              const value = parseFloat(ml);
              if (ml.endsWith("px")) return Math.round(value / 40) || 0;
              return Math.round(value / INDENT_STEP) || 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent <= 0) return {};
              return { style: `margin-left: ${attributes.indent * INDENT_STEP}em` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { $from } = state.selection;
          // listItem 내부에서는 기존 리스트 동작에 위임
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "listItem") return false;
          }
          const node = $from.parent;
          if (node.type.name !== "paragraph" && node.type.name !== "heading") return false;
          const pos = $from.before($from.depth);
          const currentIndent = node.attrs.indent || 0;
          if (currentIndent >= MAX_INDENT) return false;
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              indent: currentIndent + 1,
            });
            dispatch(tr);
          }
          return true;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "listItem") return false;
          }
          const node = $from.parent;
          if (node.type.name !== "paragraph" && node.type.name !== "heading") return false;
          const pos = $from.before($from.depth);
          const currentIndent = node.attrs.indent || 0;
          if (currentIndent <= 0) return false;
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
    const isInCodeBlock = () => this.editor.isActive("codeBlock");
    return {
      Tab: () => {
        // 코드블록 안에서는 들여쓰기 문자(\t) 삽입
        if (isInCodeBlock()) {
          return this.editor.commands.insertContent("\t");
        }
        return this.editor.commands.indent();
      },
      "Shift-Tab": () => {
        // 코드블록 안: 줄 시작의 \t 또는 앞쪽 공백 1단계 제거
        if (isInCodeBlock()) {
          const { state, view } = this.editor;
          const { $from } = state.selection;
          const lineStart = $from.start();
          const textBefore = state.doc.textBetween(lineStart, $from.pos, "\n");
          const lineStartOfCursor = textBefore.lastIndexOf("\n") + 1;
          const lineHead = textBefore.slice(lineStartOfCursor);
          const cursorAbsLineStart = $from.pos - lineHead.length;
          let removeLen = 0;
          if (lineHead.startsWith("\t")) removeLen = 1;
          else if (lineHead.startsWith("  ")) removeLen = 2;
          else if (lineHead.startsWith(" ")) removeLen = 1;
          if (!removeLen) return true;
          const tr = state.tr.delete(cursorAbsLineStart, cursorAbsLineStart + removeLen);
          view.dispatch(tr);
          return true;
        }
        return this.editor.commands.outdent();
      },
    };
  },
});
