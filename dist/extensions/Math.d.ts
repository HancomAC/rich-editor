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
import { Node } from "@tiptap/core";
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
export declare const MathInline: Node<MathOptions, any>;
export declare const MathDisplay: Node<MathOptions, any>;
//# sourceMappingURL=Math.d.ts.map