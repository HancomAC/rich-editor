// 컴포넌트
export { default as TipTapEditor } from "./components/TipTapEditor.svelte";
/*
 * ⚠️ **툴바·메뉴·모달 여섯은 여기서 re-export 하지 않는다** → `@teriusu/rich-editor/toolbars`.
 * `TipTapEditor` 가 그것들을 `editable` 일 때만 동적으로 받도록 해 놨는데(그쪽
 * `loadEditorChrome` 주석), 배럴이 정적으로 참조하면 **지연이 통째로 무효가 된다** —
 * 배럴을 가져오는 순간 다시 그래프에 들어오기 때문이다. 실측으로 그 여섯만 쓰는
 * lucide 아이콘 53 개가 75KB(gzip) 짜리 청크 하나였고, 툴바가 평생 뜨지 않는
 * 읽기 전용 라우트가 정올 176 개 중 91 개다.
 */

// 익스텐션
export { PdfBlock } from "./extensions/PdfBlock";
export { Indent } from "./extensions/Indent";
export { FixedDetails } from "./extensions/FixedDetails";
export { FileAttachment } from "./extensions/FileAttachment";
export type { FileResolver, FileResolveResult } from "./extensions/FileAttachment";
export { MbusVideo } from "./extensions/MbusVideo";
/*
 * 정올 prod 저장 형식 보존용. `MbusVideo`(lms 형식 `div[data-mbus-src]`) 와 **다른 노드**다 —
 * 이쪽은 prod 커스텀 태그 `<tiptap-midibus>` 를 그대로 읽고 그대로 되쓴다.
 */
export { TiptapMidibus } from "./extensions/TiptapMidibus";
export type {
  TiptapMidibusOptions,
  MidibusRawAttrs,
  MidibusRenderContext,
  MidibusRenderResult,
  MidibusRenderer
} from "./extensions/TiptapMidibus";
export { LegacyBlock, elementToSpec } from "./extensions/LegacyBlock";
export type {
  LegacySpec,
  LegacySpecElement,
  LegacyBlockKind,
  LegacyBlockOptions,
  LegacyBlockRenderContext,
  LegacyBlockRenderResult,
  LegacyBlockRenderer
} from "./extensions/LegacyBlock";
export { ResizableImage, normalizeImageWidth } from "./extensions/ResizableImage";
export { CardBlock } from "./extensions/CardBlock";
export type { CardBackgroundPrompt, CardBlockOptions } from "./extensions/CardBlock";
export { Columns } from "./extensions/Columns";
export { Column } from "./extensions/Column";
export { TabsBlock, Tab } from "./extensions/TabsBlock";
export { MathInline, MathDisplay } from "./extensions/Math";
export type { MathPrompt, MathOptions } from "./extensions/Math";

// 유틸리티
export { sanitizeHtml, stripHtmlToExcerpt, transformLegacyHtml } from "./utils/sanitize";
export { configurePdfJs, getPdfJs } from "./utils/pdf";
export { attachResize } from "./utils/resize";
export type { AttachResizeOptions, ResizeAxis } from "./utils/resize";
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

// 타입
export type {
  TipTapEditorProps,
  UploadHandler,
  ToolbarMode,
  ToolbarFeature,
  FixedToolbarProps,
  BlockHandleProps,
  SlashCommandMenuProps,
  SlashMenuItem,
} from "./types";
export { TOOLBAR_PRESETS, resolveFeatures } from "./types";
