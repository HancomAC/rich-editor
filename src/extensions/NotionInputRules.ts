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
import { Extension, InputRule, wrappingInputRule } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { DetailsSummary } from "@tiptap/extension-details";

/**
 * 인용문은 `" ` 로 만든다.
 *
 * ⚠️ **스마트 따옴표(`“`)도 받아야 한다.** `Typography` 확장이 켜져 있으면 `"` 를 치는 순간
 * 여는 따옴표 `“` 로 먼저 바꿔 버려서, 곧은 따옴표만 찾는 정규식은 **영영 매치되지 않는다.**
 * (편집 모드에서만 `Typography` 를 다는데, 하필 입력 규칙이 필요한 곳이 바로 거기다.)
 */
export const BLOCKQUOTE_INPUT_REGEX = /^\s*["“]\s$/;

export const NotionBlockquote = Blockquote.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: BLOCKQUOTE_INPUT_REGEX,
        type: this.type,
      }),
    ];
  },
});

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
export const LeveledDetailsSummary = DetailsSummary.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      level: {
        default: 0,
        parseHTML: (element: HTMLElement) => {
          const raw = Number(element.getAttribute("data-level"));
          return raw === 1 || raw === 2 || raw === 3 ? raw : 0;
        },
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.level ? { "data-level": String(attributes.level) } : {},
      },
    };
  },
});

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

export const TOGGLE_INPUT_REGEX = /^\s*>\s$/;

/**
 * `> ` → 토글. 제목 안에서 쳤으면 그 단계를 토글 제목으로 물려준다.
 */
export const NotionToggleInputRule = Extension.create({
  name: "notionToggleInputRule",

  addCommands() {
    return {
      setToggleHeading:
        (level) =>
        ({ chain, state }) => {
          const { schema, selection } = state;
          if (!schema.nodes.details || !schema.nodes.detailsContent) return false;

          const range = selection.$from.blockRange(selection.$to);
          if (!range) return false;

          const slice = state.doc.slice(range.start, range.end);
          if (!schema.nodes.detailsContent.contentMatch.matchFragment(slice.content)) {
            return false;
          }

          /*
           * 안으로 들어갈 내용. **제목은 문단으로 눕혀서** 넣는다 — 제목인 채로 두면
           * 접힌 안쪽에 큰 글자가 숨고, 정작 토글 머리는 빈 줄이 된다.
           * (단계는 아래 `detailsSummary` 의 `level` 로 옮겨 간다.)
           */
          const content = ((slice.toJSON()?.content || []) as Record<string, any>[]).map(
            (node) =>
              node?.type === "heading"
                ? { ...node, type: "paragraph", attrs: undefined }
                : node
          );

          /*
           * ⚠️ **한 번에 만든다.** 예전엔 `setDetails()` 로 만든 뒤 `updateAttributes` 로
           * 단계를 덧붙였는데, 그 사이 `setNodeMarkup` 이 selection 을 다시 매핑하면서
           * **빈 제목 칸에 있던 커서가 토글 바깥으로 밀렸다** — 메뉴로 토글을 만들면
           * 이어 친 글자가 토글 아래 새 문단에 들어갔다(실측).
           * 노드를 처음부터 옳게 만들면 커서를 한 번만 놓으면 된다.
           */
          return chain()
            .insertContentAt(
              { from: range.start, to: range.end },
              {
                type: "details",
                content: [
                  { type: "detailsSummary", attrs: { level } },
                  { type: "detailsContent", content },
                ],
              }
            )
            /* details(1) + detailsSummary(1) = 제목 칸 안쪽. */
            .setTextSelection(range.start + 2)
            .run();
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: TOGGLE_INPUT_REGEX,
        handler: ({ state, range, chain }) => {
          /*
           * 토글 확장이 없는 조합(호스트가 details 를 빼고 쓰는 경우)에서는 아무 일도
           * 하지 않는다. `null` 을 돌려주면 규칙이 적용되지 않고 친 글자가 그대로 남는다.
           */
          if (!state.schema.nodes.details) return null;

          const $start = state.doc.resolve(range.from);
          const parent = $start.parent;

          /*
           * ⚠️ **토글 제목 줄에서는 걸지 않는다.** `detailsSummary` 의 content 는 `text*`
           * 라 그 안에 토글을 넣을 수 없어 `setDetails()` 가 실패하는데, 그러면 친 `> ` 만
           * 사라지고 아무것도 안 생긴 것처럼 보인다.
           */
          if (parent.type.name === "detailsSummary") return null;

          const level = (
            parent.type.name === "heading" ? Number(parent.attrs.level) || 0 : 0
          ) as 0 | 1 | 2 | 3;

          /* 친 `> ` 를 지우고, 나머지는 메뉴와 **같은 커맨드**에 맡긴다. */
          chain().deleteRange(range).setToggleHeading(level).run();
        },
      }),
    ];
  },
});
