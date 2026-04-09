// 컴포넌트
export { default as TipTapEditor } from "./components/TipTapEditor.svelte";
export { default as FixedToolbar } from "./components/FixedToolbar.svelte";
export { default as BubbleToolbar } from "./components/BubbleToolbar.svelte";
export { default as SlashCommandMenu } from "./components/SlashCommandMenu.svelte";
export { default as InputModal } from "./components/InputModal.svelte";
export { default as PdfViewer } from "./components/PdfViewer.svelte";
export { default as TableBubbleMenu } from "./components/TableBubbleMenu.svelte";

// 익스텐션
export { PdfBlock } from "./extensions/PdfBlock";
export { Indent } from "./extensions/Indent";
export { FixedDetails } from "./extensions/FixedDetails";
export { FileAttachment } from "./extensions/FileAttachment";
export type { FileResolver, FileResolveResult } from "./extensions/FileAttachment";
export { VideoBlock } from "./extensions/VideoBlock";
export { Columns } from "./extensions/Columns";
export { Column } from "./extensions/Column";

// 유틸리티
export { sanitizeHtml, stripHtmlToExcerpt, transformLegacyHtml } from "./utils/sanitize";
export { configurePdfJs, getPdfJs } from "./utils/pdf";
export { cn } from "./utils/cn";

// 타입
export type {
  TipTapEditorProps,
  UploadHandler,
  ToolbarMode,
  ToolbarFeature,
  FixedToolbarProps,
  BlockHandleProps,
  SlashCommandMenuProps,
  PdfViewerProps,
  SlashMenuItem,
} from "./types";
export { TOOLBAR_PRESETS, resolveFeatures } from "./types";
