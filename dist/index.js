// 컴포넌트
export { default as TipTapEditor } from "./components/TipTapEditor.svelte";
export { default as FixedToolbar } from "./components/FixedToolbar.svelte";
export { default as BubbleToolbar } from "./components/BubbleToolbar.svelte";
export { default as SlashCommandMenu } from "./components/SlashCommandMenu.svelte";
export { default as InputModal } from "./components/InputModal.svelte";
export { default as MathModal } from "./components/MathModal.svelte";
export { default as PdfViewer } from "./components/PdfViewer.svelte";
export { default as TableBubbleMenu } from "./components/TableBubbleMenu.svelte";
// 익스텐션
export { PdfBlock } from "./extensions/PdfBlock";
export { Indent } from "./extensions/Indent";
export { FixedDetails } from "./extensions/FixedDetails";
export { FileAttachment } from "./extensions/FileAttachment";
export { MbusVideo } from "./extensions/MbusVideo";
export { CardBlock } from "./extensions/CardBlock";
export { Columns } from "./extensions/Columns";
export { Column } from "./extensions/Column";
export { MathInline, MathDisplay } from "./extensions/Math";
// 유틸리티
export { sanitizeHtml, stripHtmlToExcerpt, transformLegacyHtml } from "./utils/sanitize";
export { configurePdfJs, getPdfJs } from "./utils/pdf";
export { attachResize } from "./utils/resize";
export { cn } from "./utils/cn";
/*
 * 코드 하이라이터. **소비 앱도 이걸 가져다 쓴다** — 앱이 따로 `createLowlight(all)` 을
 * 부르면 언어 목록이 두 벌이 되고(번들에도 두 벌), 어느 쪽을 고쳐야 하는지 흐려진다.
 * 자동 감지 후보를 좁히고 싶으면 이 인스턴스를 감싸면 된다(정올 `code/index.ts` 가 그렇게 한다).
 *
 * ⚠️ **앱에서는 이 배럴 말고 `@teriusu/rich-editor/lowlight` 를 쓸 것.**
 * 여기(`index.ts`)를 타면 하이라이터 하나 때문에 **에디터 전체가 함께 로드**된다.
 * 실제로 정올이 이 경로로 가져갔다가 SSR 이 통째로 500 이 났다 — 앱 트리의
 * `@tiptap/extension-list`(3.30) 와 `@tiptap/core`(3.22) 버전이 갈려 있어서
 * `getPreviousBlockSibling` 미존재로 터졌다(문제 페이지 전부 오류 화면).
 * 서브패스로 가져오면 `utils/lowlight.js` 만 로드돼 그 지뢰를 밟지 않는다.
 */
export { lowlight, CODE_LANGUAGES } from "./utils/lowlight";
export { TOOLBAR_PRESETS, resolveFeatures } from "./types";
