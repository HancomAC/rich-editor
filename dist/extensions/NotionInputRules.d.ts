/**
 * 노션과 같은 입력 규칙(마크다운식 단축 입력).
 *
 * 기본값(TipTap StarterKit)은 `> ` 가 **인용문**이지만 노션은 `> ` 가 **토글**이고 인용문은
 * `" ` 다. 두 편집기를 오가며 쓰는 사용자가 계속 헛손질을 하게 되므로 노션 쪽에 맞춘다
 * (사용자 요청).
 *
 * | 치는 것 | 되는 것 |
 * |---|---|
 * | `" ` | 인용문 |
 * | `> ` | 토글 |
 * | `# > ` · `## > ` · `### > ` | 토글 제목 1·2·3 |
 *
 * `# > ` 는 **한 규칙이 아니다.** `# ` 에서 StarterKit 이 이미 제목으로 바꾸고, 이어지는
 * `> ` 를 아래 토글 규칙이 받는다. 그래서 토글 규칙은 "지금 블록이 제목이면 그 단계를
 * 토글 제목으로 물려준다" 만 하면 된다 — 제목 안에서 `> ` 를 쳐도 똑같이 동작한다.
 */
import { Extension } from "@tiptap/core";
/**
 * 인용문은 `" ` 로 만든다.
 *
 * ⚠️ **스마트 따옴표(`“`)도 받아야 한다.** `Typography` 확장이 켜져 있으면 `"` 를 치는 순간
 * 여는 따옴표 `“` 로 먼저 바꿔 버려서, 곧은 따옴표만 찾는 정규식은 **영영 매치되지 않는다.**
 * (편집 모드에서만 `Typography` 를 다는데, 하필 입력 규칙이 필요한 곳이 바로 거기다.)
 */
export declare const BLOCKQUOTE_INPUT_REGEX: RegExp;
export declare const NotionBlockquote: import("@tiptap/core").Node<import("@tiptap/extension-blockquote").BlockquoteOptions, any>;
/**
 * 토글 제목을 위해 `detailsSummary` 에 **단계(`level`)** 를 붙인 판본.
 *
 * 제목을 `<summary>` 안에 **노드로** 넣지 않는다. `detailsSummary` 의 content 는 `text*`
 * 라 블록인 제목이 아예 들어가지 못하고, 스키마를 열면 옛 문서와 호환이 깨진다.
 * 대신 `data-level` 속성 하나로 표시하고 크기는 CSS 가 준다(`editor.css` 의
 * `summary[data-level]`). 저장된 HTML 도 `<summary data-level="1">` 한 겹이라
 * 에디터 밖에서 읽어도 안전하다.
 *
 * ⚠️ 기본값은 `0`(= 일반 토글)이고, 그때는 **속성을 아예 내보내지 않는다.** 지금까지 저장된
 * 토글에 `data-level="0"` 이 새로 붙어 문서가 통째로 바뀐 것처럼 보이는 일을 막는다.
 */
export declare const LeveledDetailsSummary: import("@tiptap/core").Node<import("@tiptap/extension-details").DetailsSummaryOptions, any>;
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        notionToggle: {
            /**
             * 토글을 만들고 제목 단계를 준다. `0` 이면 평범한 토글.
             *
             * 입력 규칙(`> `)과 메뉴(`토글 제목 1`)가 **같은 것을 쓴다** — 두 벌로 두면
             * 한쪽만 고쳐져 "쳐서 만든 것과 메뉴로 만든 것이 다른" 상태가 된다.
             */
            setToggleHeading: (level: 0 | 1 | 2 | 3) => ReturnType;
        };
    }
}
export declare const TOGGLE_INPUT_REGEX: RegExp;
/**
 * `> ` → 토글. 제목 안에서 쳤으면 그 단계를 토글 제목으로 물려준다.
 */
export declare const NotionToggleInputRule: Extension<any, any>;
//# sourceMappingURL=NotionInputRules.d.ts.map