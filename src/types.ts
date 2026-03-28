import type { Editor } from "@tiptap/react";

/** 파일 업로드 핸들러 — 호스트 앱에서 구현 */
export type UploadHandler = (file: File) => Promise<string>;

export interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 이미지/PDF 파일 업로드 시 호출. URL을 반환해야 함 */
  onUploadFile?: UploadHandler;
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
  icon: React.ReactNode;
  command: (editor: Editor) => void;
}
