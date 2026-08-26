/**
 * KaTeX 기반 inline/display math 노드.
 *
 * 저장 포맷은 prod(arcturus + @seorii/prosemirror-math)와 호환:
 *   - inline: <math-inline class="math-node">LATEX</math-inline>
 *   - display: <math-display class="math-node">LATEX</math-display>
 *
 * 노드는 atom이며 텍스트 콘텐츠(LaTeX 원문)를 자식 텍스트 노드로 보관한다.
 * NodeView가 KaTeX로 렌더링한다.
 *
 * ## 입력 경로 — 구세대(@seorii/tiptap)와 맞춘 것
 *
 * 이전할 때 **렌더만 옮기고 넣는 길이 통째로 빠져 있었다.** 문서는 열리는데 새 수식을
 * 만들 방법이 없었다는 뜻이다. 구세대가 갖고 있던 네 경로를 여기로 되살렸다:
 *
 * | 경로 | 구세대 | 여기 |
 * |---|---|---|
 * | `$…$` | `makeInlineMathInputRule(/\$(.+)\$/)` | `addInputRules` (MathInline) |
 * | `$$…$$` / `$$`+스페이스 | `makeBlockMathInputRule(/\$\$\s+$/)` | `addInputRules` (MathDisplay) |
 * | 붙여넣기 `$…$` 자동 변환 | `plugin/mathPaste.js` | `mathPastePlugin` (아래) |
 * | 선택 영역 감싸기/풀기 | `tiptap/setMath.js` | `toggleMathInline` 커맨드 |
 *
 * ## 편집은 모달로 — 구세대와 다른 유일한 지점
 *
 * 구세대는 노드 안에 **중첩 EditorView**를 띄워 LaTeX 원문을 그 자리에서 고치게 했다
 * (`MathView` + `mathPlugin`/`mathSelectPlugin`, vanilla ProseMirror 400줄 남짓).
 * 여기서는 그 대신 **호스트가 주는 프롬프트 훅**을 부른다 — 링크·이미지·카드 배경이
 * 이미 쓰는 규약(`onPromptLink`, `promptBackground`)과 같은 모양이고, ProseMirror
 * 내부(중첩 뷰·커서 브리지·backspace 체인)에 손대지 않아 유지비가 훨씬 싸다.
 *
 * 호스트가 `promptMath`를 안 주면 `window.prompt`로 떨어진다.
 */
import { InputRule, Node, mergeAttributes, type Editor } from "@tiptap/core";
import { Fragment, Slice, type Node as PMNode, type NodeType } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import katex from "katex";

/** 현재 LaTeX 원문을 받아 새 값(취소면 null)을 돌려주는 호스트 훅. */
export type MathPrompt = (latex: string, displayMode: boolean) => Promise<string | null>;

export interface MathOptions {
  HTMLAttributes: Record<string, unknown>;
  promptMath: MathPrompt | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      insertMathInline: (latex: string) => ReturnType;
      /** 선택 영역을 인라인 수식으로 감싼다. 이미 수식이면 원문 텍스트로 되돌린다. */
      toggleMathInline: () => ReturnType;
      /** 프롬프트를 띄워 인라인 수식을 새로 넣는다. */
      promptMathInline: () => ReturnType;
    };
    mathDisplay: {
      insertMathDisplay: (latex: string) => ReturnType;
      /** 프롬프트를 띄워 수식 블록을 새로 넣는다. */
      promptMathDisplay: () => ReturnType;
    };
  }
}

const INLINE_NAME = "math_inline";
const DISPLAY_NAME = "math_display";

/**
 * 이스케이프한 `\$`는 수식으로 보지 않는다. 룩비하인드가 없는 런타임(구형 사파리)에서는
 * 이스케이프 구분 없이 동작하는 쪽으로 떨어진다 — 구세대 `REGEX_INLINE_MATH_DOLLARS_ESCAPED`가
 * 쓰던 방어를 그대로 옮겼다.
 */
function safeRegExp(withLookbehind: string, fallback: RegExp): RegExp {
  try {
    return new RegExp(withLookbehind);
  } catch {
    return fallback;
  }
}

/**
 * `$x^2$` → 인라인 수식.
 *
 * ⚠️ 구세대 `REGEX_INLINE_MATH_DOLLARS`(`/\$(.+)\$/`)보다 **좁게** 잡는다. 그대로 쓰면
 * `$5 와 $` 까지 친 순간 "5 와 " 가 수식이 돼 버린다(금액 표기가 흔한 게시판에서 바로 터진다).
 * 그래서 내용의 **첫 글자와 끝 글자가 공백이 아닐 것**을 요구한다 — 붙여넣기 변환이 쓰는
 * 판별과 같은 기준이다.
 */
const INLINE_PATTERN = safeRegExp(
  "(?<!\\\\)\\$([^$\\n\\s](?:[^$\\n]*[^$\\n\\s])?)(?<!\\\\)\\$$",
  /\$([^$\n\s](?:[^$\n]*[^$\n\s])?)\$$/,
);

/** `$$x^2$$` → 수식 블록(내용까지 한 번에). */
const DISPLAY_PATTERN = safeRegExp(
  "(?<!\\\\)\\$\\$([^$\\n]+?)\\$\\$$",
  /\$\$([^$\n]+?)\$\$$/,
);

/**
 * `$$` + 스페이스 → 빈 수식 블록 대신 **프롬프트**를 연다. 구세대 `REGEX_BLOCK_MATH_DOLLARS`.
 *
 * `^` 로 **줄 맨 앞**에 못 박는다(입력 규칙은 텍스트블록 시작부터의 문자열에 맞춘다).
 * 안 그러면 문장 중간의 `$$ ` 가 문단을 쪼개며 블록을 끼워 넣는다.
 */
const DISPLAY_OPEN_PATTERN = /^\$\$\s$/;

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return `<span class="math-error">${latex}</span>`;
  }
}

/**
 * 프롬프트 훅 꺼내기.
 *
 * 이 패키지는 `Storage` 타입 증강을 하지 않아 인덱스 접근이 막힌다(`editor.storage.card`도
 * 같은 이유로 unknown 을 거친다). 두 노드가 같은 훅을 공유하므로 있는 쪽을 쓴다 — 호스트가
 * 한쪽만 직접 등록했을 때도 편집이 죽지 않게 하려는 것이다.
 */
function getPrompt(editor: Editor): MathPrompt | null {
  const storage = editor.storage as unknown as Record<string, unknown>;
  const inline = storage[INLINE_NAME] as { promptMath?: MathPrompt | null } | undefined;
  const display = storage[DISPLAY_NAME] as { promptMath?: MathPrompt | null } | undefined;
  return inline?.promptMath ?? display?.promptMath ?? null;
}

async function askMath(
  editor: Editor,
  current: string,
  displayMode: boolean,
): Promise<string | null> {
  const prompt = getPrompt(editor);
  if (prompt) return prompt(current, displayMode);
  return window.prompt(displayMode ? "수식 (LaTeX)" : "인라인 수식 (LaTeX)", current);
}

/** 프롬프트를 띄워 새 수식을 넣는다. 취소·빈 입력이면 아무것도 하지 않는다. */
async function promptInsert(editor: Editor, displayMode: boolean): Promise<void> {
  const next = await askMath(editor, "", displayMode);
  const latex = next?.trim();
  if (!latex) {
    editor.commands.focus();
    return;
  }
  if (displayMode) editor.chain().focus().insertMathDisplay(latex).run();
  else editor.chain().focus().insertMathInline(latex).run();
}

/** 이미 있는 노드의 LaTeX를 고친다. 빈 값으로 확인하면 노드를 지운다. */
async function promptEdit(
  editor: Editor,
  getPos: () => number | undefined,
  displayMode: boolean,
  currentLatex: string,
): Promise<void> {
  const next = await askMath(editor, currentLatex, displayMode);
  if (next == null) {
    editor.commands.focus();
    return;
  }
  const latex = next.trim();
  const name = displayMode ? DISPLAY_NAME : INLINE_NAME;

  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const pos = getPos();
      if (pos == null) return false;
      // 프롬프트가 열려 있는 동안 문서가 바뀌었을 수 있다 — 크기를 캐시하지 않고 다시 읽는다.
      const target = tr.doc.nodeAt(pos);
      if (!target || target.type.name !== name) return false;
      const to = pos + target.nodeSize;
      if (!latex) {
        tr.delete(pos, to);
        return true;
      }
      tr.replaceWith(pos, to, target.type.create(null, state.schema.text(latex)));
      return true;
    })
    .run();
}

function buildNodeView(displayMode: boolean) {
  return ({
    editor,
    node,
    getPos,
    HTMLAttributes,
  }: {
    editor: Editor;
    node: PMNode;
    getPos: () => number | undefined;
    HTMLAttributes: Record<string, unknown>;
  }) => {
    const tag = displayMode ? "math-display" : "math-inline";
    const dom = document.createElement(tag);
    Object.entries({ class: "math-node", ...HTMLAttributes }).forEach(([k, v]) => {
      if (v != null) dom.setAttribute(k, String(v));
    });
    // 노드는 atom이라 contentDOM이 없다. 안이 편집 가능한 채로 남으면 캐럿이 들어가
    // KaTeX가 뱉은 마크업을 직접 건드리게 된다.
    dom.contentEditable = "false";

    let current = node;
    let editing = false;

    const paint = () => {
      const latex = current.textContent.trim();
      if (!latex) {
        dom.classList.add("empty-math");
        dom.innerHTML = `<span class="math-placeholder">${displayMode ? "수식 입력" : "수식"}</span>`;
        return;
      }
      dom.classList.remove("empty-math");
      dom.innerHTML = renderKatex(latex, displayMode);
    };

    // 클릭 한 번에 편집 — 구세대(`ensureFocus`)와 같은 즉시성.
    // ⚠️ `preventDefault`/`stopPropagation`을 걸지 않는다. 그래야 ProseMirror가 NodeSelection도
    //    같이 잡아, 프롬프트를 취소했을 때 노드가 선택된 채 남아 Backspace로 지울 수 있다.
    dom.addEventListener("click", () => {
      if (!editor.isEditable || editing) return;
      editing = true;
      void promptEdit(editor, getPos, displayMode, current.textContent).finally(() => {
        editing = false;
      });
    });

    paint();

    return {
      dom,
      update: (updated: PMNode) => {
        if (updated.type.name !== current.type.name) return false;
        current = updated;
        paint();
        return true;
      },
      // contentDOM이 없으므로 이 안의 DOM 변화는 전부 우리가 만든 것이다.
      ignoreMutation: () => true,
    };
  };
}

/* -------------------------------------------------------------------------- */
/* 붙여넣기 변환 — 구세대 `plugin/mathPaste.js` 이식                              */
/* -------------------------------------------------------------------------- */

const mathPasteKey = new PluginKey("mathPaste");

/**
 * 워드·한글·LLM 답변에서 긁어온 `$…$` / `$$…$$` 텍스트를 수식 노드로 바꾼다.
 *
 * 구세대 구현을 그대로 옮겼다. 규칙이 잔손이 많아 보이는데 전부 오탐을 막으려던 것이다:
 * 코드 블록·코드 마크 안은 건드리지 않고, 여는 `$` 바로 뒤나 닫는 `$` 바로 앞이 공백이면
 * (`$5 과 $10` 같은 금액 표기) 수식으로 보지 않는다.
 */
function mathPastePlugin(): Plugin {
  return new Plugin({
    key: mathPasteKey,
    props: {
      transformPasted: (slice, view) => {
        const { schema } = view.state;
        const mathInline = schema.nodes[INLINE_NAME];
        const mathDisplay = schema.nodes[DISPLAY_NAME];
        if (!mathInline && !mathDisplay) return slice;

        let changed = false;
        let blockChanged = false;

        const transformFragment = (fragment: Fragment, parent: PMNode | null): Fragment => {
          const nodes: PMNode[] = [];
          for (let index = 0; index < fragment.childCount; index++) {
            const node = fragment.child(index);
            if (
              parent?.type.spec.code ||
              node.type.spec.code ||
              node.type.name.startsWith("math_")
            ) {
              nodes.push(node);
              continue;
            }

            // `$$` 만 있는 줄 … 본문 … `$$` 만 있는 줄  → 한 덩어리 수식 블록
            if (mathDisplay && node.isTextblock && node.textContent.trim() === "$$") {
              const source: string[] = [];
              let endIndex = -1;
              for (let offset = index + 1; offset < fragment.childCount; offset++) {
                const candidate = fragment.child(offset);
                if (
                  candidate.type.spec.code ||
                  candidate.type.name.startsWith("math_") ||
                  !candidate.isTextblock
                ) {
                  break;
                }
                const text = candidate.textContent;
                if (text.trim() === "$$") {
                  endIndex = offset;
                  break;
                }
                source.push(text);
              }
              const text = source.join("\n").trim();
              if (endIndex > -1 && text.length) {
                nodes.push(mathDisplay.create(null, schema.text(text)));
                index = endIndex;
                changed = true;
                blockChanged = true;
                continue;
              }
            }

            // 한 줄이 통째로 `$$…$$` 인 경우
            if (mathDisplay && node.isTextblock) {
              const match = /^\s*\$\$([\s\S]*?)\$\$\s*$/.exec(node.textContent);
              const text = match?.[1]?.trim();
              if (text) {
                nodes.push(mathDisplay.create(null, schema.text(text)));
                changed = true;
                blockChanged = true;
                continue;
              }
            }

            if (node.isText) {
              if (!mathInline || node.marks.some((mark) => mark.type.spec.code)) {
                nodes.push(node);
                continue;
              }
              const text = node.text || "";
              const inlineNodes: PMNode[] = [];
              let cursor = 0;
              let searchFrom = 0;
              while (searchFrom < text.length) {
                const open = text.indexOf("$", searchFrom);
                if (open === -1) break;
                const beforeOpen = text[open - 1];
                const afterOpen = text[open + 1];
                if (
                  beforeOpen === "\\" ||
                  beforeOpen === "$" ||
                  afterOpen === "$" ||
                  !afterOpen ||
                  /\s/.test(afterOpen)
                ) {
                  searchFrom = open + 1;
                  continue;
                }
                let close = open + 1;
                while (close < text.length) {
                  close = text.indexOf("$", close);
                  if (close === -1) break;
                  const beforeClose = text[close - 1];
                  const afterClose = text[close + 1];
                  if (
                    beforeClose === "\\" ||
                    beforeClose === "$" ||
                    afterClose === "$" ||
                    /\s/.test(beforeClose)
                  ) {
                    close++;
                    continue;
                  }
                  break;
                }
                if (close === -1) break;
                const source = text.slice(open + 1, close);
                if (!source.trim()) {
                  searchFrom = close + 1;
                  continue;
                }
                if (open > cursor) {
                  inlineNodes.push(schema.text(text.slice(cursor, open), node.marks));
                }
                inlineNodes.push(mathInline.create(null, schema.text(source), node.marks));
                cursor = close + 1;
                searchFrom = cursor;
              }
              if (!inlineNodes.length) {
                nodes.push(node);
                continue;
              }
              if (cursor < text.length) {
                inlineNodes.push(schema.text(text.slice(cursor), node.marks));
              }
              nodes.push(...inlineNodes);
              changed = true;
              continue;
            }

            if (!node.content.size) {
              nodes.push(node);
              continue;
            }
            const content = transformFragment(node.content, node);
            nodes.push(content.eq(node.content) ? node : node.copy(content));
          }
          return Fragment.fromArray(nodes);
        };

        const content = transformFragment(slice.content, null);
        if (!changed) return slice;
        // 블록이 바뀌었으면 열린 깊이를 유지할 수 없다 — 구세대와 같은 처리.
        return blockChanged
          ? new Slice(content, 0, 0)
          : new Slice(content, slice.openStart, slice.openEnd);
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* 선택 영역 감싸기 / 풀기 — 구세대 `tiptap/setMath.js` 이식                       */
/* -------------------------------------------------------------------------- */

interface MathTarget {
  from: number;
  to: number;
  text: string;
}

function pushUniqueTarget(targets: MathTarget[], from: number, to: number, text: string): void {
  if (targets.some((target) => target.from === from && target.to === to)) return;
  targets.push({ from, to, text });
}

/** 현재 선택이 걸쳐 있는 인라인 수식 노드들. 셋 다 필요하다 — 노드선택/캐럿/범위선택. */
function collectMathTargets(state: EditorState, mathInline: NodeType): MathTarget[] {
  const targets: MathTarget[] = [];
  const { selection } = state;
  if (selection instanceof NodeSelection && selection.node.type === mathInline) {
    pushUniqueTarget(targets, selection.from, selection.to, selection.node.textContent);
  }
  if (selection.$from.parent.type === mathInline) {
    const depth = selection.$from.depth;
    pushUniqueTarget(
      targets,
      selection.$from.before(depth),
      selection.$from.after(depth),
      selection.$from.parent.textContent,
    );
  }
  state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type !== mathInline) return;
    pushUniqueTarget(targets, position, position + node.nodeSize, node.textContent);
    return false;
  });
  return targets;
}

/* -------------------------------------------------------------------------- */
/* 노드                                                                        */
/* -------------------------------------------------------------------------- */

export const MathInline = Node.create<MathOptions>({
  name: INLINE_NAME,
  group: "inline",
  inline: true,
  atom: true,
  content: "text*",
  code: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: { class: "math-node" },
      promptMath: null,
    };
  },

  addStorage() {
    return {
      promptMath: this.options.promptMath as MathPrompt | null,
    };
  },

  parseHTML() {
    return [{ tag: "math-inline" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["math-inline", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addNodeView() {
    return buildNodeView(false) as never;
  },

  addInputRules() {
    return [
      new InputRule({
        find: INLINE_PATTERN,
        handler: ({ chain, range, match }) => {
          const latex = (match[1] ?? "").trim();
          if (!latex) return;
          chain().deleteRange(range).insertMathInline(latex).run();
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    // 두 노드가 다 등록돼도 붙여넣기 변환은 **한 번만** 걸어야 한다.
    // 인라인 쪽에 두고, 안에서 두 노드 타입을 모두 처리한다.
    return [mathPastePlugin()];
  },

  addCommands() {
    return {
      insertMathInline:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: INLINE_NAME,
            content: [{ type: "text", text: latex }],
          }),

      promptMathInline:
        () =>
        ({ editor }) => {
          void promptInsert(editor, false);
          return true;
        },

      toggleMathInline:
        () =>
        ({ state, tr, dispatch }) => {
          const mathInline = state.schema.nodes[INLINE_NAME];
          if (!mathInline) return false;

          // 1) 이미 수식이면 원문 텍스트로 되돌린다.
          const existing = collectMathTargets(state, mathInline);
          if (existing.length) {
            if (!dispatch) return true;
            for (const { from, to, text } of existing.sort((a, b) => b.from - a.from)) {
              if (!text.length) tr.delete(from, to);
              else tr.replaceWith(from, to, state.schema.text(text));
            }
            return true;
          }

          // 2) 아니면 선택한 텍스트를 감싼다.
          if (state.selection.empty) return false;
          const targets: MathTarget[] = [];
          state.doc.nodesBetween(state.selection.from, state.selection.to, (node, position) => {
            if (!node.isTextblock) return;
            const from = Math.max(state.selection.from, position + 1);
            const to = Math.min(state.selection.to, position + node.nodeSize - 1);
            if (from >= to) return;
            const text = state.doc.textBetween(from, to, "");
            if (!text.length) return;
            targets.push({ from, to, text });
          });
          if (!targets.length) return false;
          if (!dispatch) return true;
          for (const { from, to, text } of targets.sort((a, b) => b.from - a.from)) {
            tr.replaceWith(from, to, mathInline.create(null, state.schema.text(text)));
          }
          return true;
        },
    };
  },
});

export const MathDisplay = Node.create<MathOptions>({
  name: DISPLAY_NAME,
  group: "block",
  atom: true,
  content: "text*",
  code: true,
  selectable: true,
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: { class: "math-node" },
      promptMath: null,
    };
  },

  addStorage() {
    return {
      promptMath: this.options.promptMath as MathPrompt | null,
    };
  },

  parseHTML() {
    return [{ tag: "math-display" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["math-display", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addNodeView() {
    return buildNodeView(true) as never;
  },

  addInputRules() {
    // InputRule 핸들러의 인자에는 `editor` 가 없다(`state`/`range`/`match`/커맨드뿐).
    // 확장 컨텍스트에서 미리 잡아 둔다.
    const { editor } = this;
    return [
      // 내용까지 한 번에 친 경우 — 프롬프트 없이 바로 만든다.
      new InputRule({
        find: DISPLAY_PATTERN,
        handler: ({ chain, range, match }) => {
          const latex = (match[1] ?? "").trim();
          if (!latex) return;
          chain().deleteRange(range).insertMathDisplay(latex).run();
        },
      }),
      // `$$` + 스페이스 — 빈 노드를 심는 대신 프롬프트를 연다.
      // 취소하면 문서에 아무것도 남지 않는다(빈 수식 블록이 굴러다니지 않게).
      new InputRule({
        find: DISPLAY_OPEN_PATTERN,
        handler: ({ commands, range }) => {
          commands.deleteRange(range);
          void promptInsert(editor, true);
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertMathDisplay:
        (latex: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: DISPLAY_NAME,
            content: [{ type: "text", text: latex }],
          }),

      promptMathDisplay:
        () =>
        ({ editor }) => {
          void promptInsert(editor, true);
          return true;
        },
    };
  },
});
