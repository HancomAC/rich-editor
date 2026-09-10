/**
 * 편집 크롬(툴바·메뉴·모달) 진입점.
 *
 * **배럴(`index.ts`)이 아니라 여기에 있는 이유**: `TipTapEditor` 는 이 일곱을
 * `editable` 일 때만 동적으로 받는다(그쪽 `loadEditorChrome` 주석에 실측이 있다).
 * 배럴이 같은 것을 정적으로 re-export 하면 **그 지연이 무효가 된다** — 배럴을
 * 한 번이라도 가져오는 순간 그래프에 다시 들어오기 때문이다. 그래서 갈라 둔다.
 *
 * 직접 쓸 일은 드물다. `TipTapEditor` 를 쓰면 알아서 실린다.
 * 툴바만 따로 배치하는 호스트만 `@teriusu/rich-editor/toolbars` 로 가져간다.
 */
export { default as FixedToolbar } from "./components/FixedToolbar.svelte";
export { default as BubbleToolbar } from "./components/BubbleToolbar.svelte";
export { default as SlashCommandMenu } from "./components/SlashCommandMenu.svelte";
export { default as TableBubbleMenu } from "./components/TableBubbleMenu.svelte";
export { default as InputModal } from "./components/InputModal.svelte";
export { default as MathModal } from "./components/MathModal.svelte";
//# sourceMappingURL=toolbars.d.ts.map