import type { Editor } from "@tiptap/core";
import type { Component } from "svelte";
import type { FileResolver } from "./extensions/FileAttachment";

/** 파일 업로드 핸들러 -- 호스트 앱에서 구현 */
export type UploadHandler = (file: File) => Promise<string>;

/** 툴바 모드 */
export type ToolbarMode = 'minimal' | 'standard' | 'full';

export interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 이미지/PDF 파일 업로드 시 호출. URL을 반환해야 함 */
  onUploadFile?: UploadHandler;
  /** 파일 ID → URL 변환. 하이브리드 파일 저장 시 사용 */
  onResolveFile?: FileResolver;
  /** 툴바 모드: 'minimal' | 'standard' | 'full' (기본값 'full') */
  toolbar?: ToolbarMode;
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
