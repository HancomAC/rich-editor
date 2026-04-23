import type { Editor } from "@tiptap/core";
import type { Component } from "svelte";
import type { FileResolver } from "./extensions/FileAttachment";

/** 파일 업로드 핸들러 -- 호스트 앱에서 구현 */
export type UploadHandler = (file: File) => Promise<string>;

/**
 * URL 프롬프트 핸들러 -- 호스트 앱에서 Dialog 등으로 구현.
 * 제공되지 않으면 내장 InputModal (링크/이미지) 또는 window.prompt (Bubble)로 폴백.
 * null 반환 = 취소.
 */
export type PromptHandler = (defaultValue: string) => Promise<string | null>;

/** 툴바 모드 */
export type ToolbarMode = 'minimal' | 'standard' | 'full';

/** 개별 툴바 기능 ID */
export type ToolbarFeature =
	// 서식
	| 'bold' | 'italic' | 'underline' | 'strike' | 'highlight'
	| 'superscript' | 'subscript' | 'code'
	// 정렬
	| 'align-left' | 'align-center' | 'align-right'
	// 제목
	| 'h1' | 'h2' | 'h3'
	// 블록
	| 'bullet-list' | 'ordered-list' | 'checklist'
	| 'blockquote' | 'horizontal-rule' | 'toggle'
	// 미디어
	| 'link' | 'image' | 'pdf' | 'youtube' | 'video' | 'file'
	// 레이아웃
	| 'columns-2' | 'columns-3' | 'table' | 'code-block'
	// 히스토리
	| 'undo' | 'redo'
	// UI 영역
	| 'fixed-toolbar' | 'bubble-toolbar' | 'slash-menu'
	| 'table-menu' | 'character-count' | 'upload-overlay';

/** 모드별 기본 feature 프리셋 */
export const TOOLBAR_PRESETS: Record<ToolbarMode, ToolbarFeature[]> = {
	full: [
		'bold', 'italic', 'underline', 'strike', 'highlight',
		'superscript', 'subscript', 'code',
		'align-left', 'align-center', 'align-right',
		'h1', 'h2', 'h3',
		'bullet-list', 'ordered-list', 'checklist',
		'blockquote', 'horizontal-rule', 'toggle',
		'link', 'image', 'pdf', 'youtube', 'video', 'file',
		'columns-2', 'columns-3', 'table', 'code-block',
		'undo', 'redo',
		'fixed-toolbar', 'slash-menu',
		'table-menu', 'character-count', 'upload-overlay'
	],
	standard: [
		'bold', 'italic', 'strike', 'code',
		'h1', 'h2', 'h3',
		'bullet-list', 'ordered-list', 'checklist',
		'blockquote', 'horizontal-rule', 'toggle',
		'link', 'image', 'pdf', 'youtube', 'video', 'file',
		'columns-2', 'columns-3', 'table', 'code-block',
		'fixed-toolbar', 'slash-menu', 'table-menu'
	],
	minimal: [
		'bold', 'italic', 'strike', 'code',
		'h2', 'h3',
		'bullet-list', 'ordered-list', 'checklist',
		'blockquote', 'code-block',
		'link', 'image', 'file', 'pdf',
		'bubble-toolbar', 'slash-menu'
	]
};

/** features 배열 → Set 변환. features가 있으면 그걸 쓰고 없으면 toolbar 모드 프리셋 */
export function resolveFeatures(
	toolbar: ToolbarMode,
	features?: ToolbarFeature[]
): Set<ToolbarFeature> {
	return new Set(features ?? TOOLBAR_PRESETS[toolbar]);
}

export interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 이미지/PDF 파일 업로드 시 호출. URL을 반환해야 함 */
  onUploadFile?: UploadHandler;
  /** 파일 ID → URL 변환. 하이브리드 파일 저장 시 사용 */
  onResolveFile?: FileResolver;
  /** 링크 URL 프롬프트. 미제공 시 내장 InputModal (FixedToolbar) / window.prompt (BubbleToolbar) 폴백 */
  onPromptLink?: PromptHandler;
  /** 이미지 URL 프롬프트. 미제공 시 내장 InputModal 폴백 */
  onPromptImage?: PromptHandler;
  /** 툴바 모드: 'minimal' | 'standard' | 'full' (기본값 'full') */
  toolbar?: ToolbarMode;
  /** 개별 기능 커스터마이징. 설정 시 toolbar 모드 프리셋 대신 이 배열을 사용 */
  features?: ToolbarFeature[];
}

export interface FixedToolbarProps {
  editor: Editor;
  onPdfClick: () => void;
}

export interface BlockHandleProps {
  editor: Editor;
}

export interface SlashCommandMenuProps {
  editor: Editor;
  query: string;
  onClose: () => void;
  onPdfUpload?: () => void;
}

export interface PdfViewerProps {
  src: string;
  fileName?: string;
}

export interface SlashMenuItem {
  label: string;
  keywords: string;
  icon: Component<{ size?: number }>;
  command: (editor: Editor) => void;
}
