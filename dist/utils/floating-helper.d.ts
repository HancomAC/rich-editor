/**
 * 빈 줄 플로팅 헬퍼의 **판정 절반** — 화면 절반은 `components/FloatingHelper.svelte`.
 *
 * 이모지 자동완성(`emoji-suggestion.ts` + `EmojiSuggestionMenu.svelte`)과 같은 분할이다:
 * 상태 판정·커맨드는 여기(순수 TS, vitest 로 검증), 위치 계산·렌더는 컴포넌트가 맡는다.
 *
 * main(정올 `Floating.svelte`)은 svelte-tiptap `FloatingMenu` + floating-ui 를 썼지만
 * 여기는 **직접 구현**이다 — 이 패키지에 svelte-tiptap 이 없고, floating-ui 는 tiptap
 * 전이 의존성으로만 존재해(선언 안 됨) 기대면 안 된다. 등장 조건은 main 이 쓰던
 * tiptap 기본 `shouldShow`(포커스된 최상위 빈 textblock)를 옮겨 왔다.
 */
import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
/**
 * 헬퍼가 떠 있는 동안 에디터 루트(`.tiptap`)에 붙는 클래스.
 *
 * ⚠️ **placeholder 겹침 방지용이다.** 이 패키지는 `.is-empty::before` 로 커서가 있는
 * 빈 블록마다 안내문을 띄우는데, 헬퍼도 같은 자리에 같은 취지의 문구를 띄운다 —
 * 두 문구가 겹쳐 보인다. 그래서 헬퍼가 보이는 동안 `editor.css` 의
 * `.tiptap.hce-floating-helper-on .is-empty::before` 규칙이 placeholder 를 숨긴다
 * (main `82c412a9` 의 `floating-menu-visible` 과 같은 방식).
 */
export declare const FLOATING_HELPER_ON_CLASS = "hce-floating-helper-on";
/**
 * 상태만 보고 "헬퍼를 띄울 자리인가"를 판정한다.
 *
 * main 이 위임했던 tiptap FloatingMenu 기본 `shouldShow` 의 이식 + 한 가지 의도적 차이:
 * - 커서가 접혀 있고(selection.empty)
 * - 최상위 깊이(depth 1)의
 * - **문단(paragraph)** 이며 — main 은 모든 textblock(빈 제목 포함)이었지만, 이
 *   패키지는 빈 제목에 "제목 1" 같은 전용 placeholder 를 띄우므로 제목에서는
 *   placeholder 에게 자리를 내준다(제목에서 헬퍼가 뜨면 그 안내가 숨는다).
 * - 내용이 완전히 비어 있어야 한다(`content.size === 0` — 인라인 수식·이미지처럼
 *   textContent 가 "" 인 노드가 들어 있어도 빈 줄이 아니다).
 *
 * 슬래시(`/…`)·이모지(`:…`) 트리거 텍스트가 있으면 블록이 비어 있지 않으므로
 * 이 판정만으로도 두 팝업이 뜨는 동안에는 자연히 숨는다.
 */
export declare function isEmptyRootParagraph(state: EditorState): boolean;
/**
 * 최종 표시 판정. 포커스·읽기 전용·팝업 상호배제는 컴포넌트가 아는 값이라 주입받는다.
 *
 * `suppressed` 는 슬래시·이모지 메뉴 열림이다 — 위 판정으로도 대부분 숨지만,
 * 두 팝업은 `position:fixed` 뷰포트 좌표라 좌표계가 달라 자동 회피가 안 되므로
 * **열려 있는 동안은 무조건 끈다**(main `f0f955b1`·`b518d4f9` 의 lifecycle desync 교훈).
 */
export declare function floatingHelperVisible(editor: Editor, opts: {
    focused: boolean;
    suppressed: boolean;
}): boolean;
/**
 * 수식 버튼. 슬래시 메뉴의 `수식` 항목과 **같은 커맨드**를 쓴다 — 프롬프트(MathModal)를
 * 띄워 수식 블록을 넣는다. main 은 빈 `math_inline` 노드를 심고 NodeSelection 으로
 * 골라 두는 방식이었지만, 이 패키지의 수식 편집 진입점은 전부 프롬프트 경유라
 * (입력 규칙 제외) 그 관례를 따른다.
 */
export declare function helperInsertMath(editor: Editor): boolean;
/** 코드 버튼. 슬래시 메뉴의 `코드` 항목과 같은 커맨드다. */
export declare function helperInsertCodeBlock(editor: Editor): boolean;
//# sourceMappingURL=floating-helper.d.ts.map