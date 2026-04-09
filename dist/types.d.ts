import type { Editor } from "@tiptap/core";
import type { Component } from "svelte";
import type { FileResolver } from "./extensions/FileAttachment";
/** 파일 업로드 핸들러 -- 호스트 앱에서 구현 */
export type UploadHandler = (file: File) => Promise<string>;
/** 툴바 모드 */
export type ToolbarMode = 'minimal' | 'standard' | 'full';
/** 개별 툴바 기능 ID */
export type ToolbarFeature = 'bold' | 'italic' | 'underline' | 'strike' | 'highlight' | 'superscript' | 'subscript' | 'code' | 'align-left' | 'align-center' | 'align-right' | 'h1' | 'h2' | 'h3' | 'bullet-list' | 'ordered-list' | 'checklist' | 'blockquote' | 'horizontal-rule' | 'toggle' | 'link' | 'image' | 'pdf' | 'youtube' | 'video' | 'file' | 'columns-2' | 'columns-3' | 'table' | 'code-block' | 'undo' | 'redo' | 'fixed-toolbar' | 'bubble-toolbar' | 'slash-menu' | 'table-menu' | 'character-count' | 'upload-overlay';
/** 모드별 기본 feature 프리셋 */
export declare const TOOLBAR_PRESETS: Record<ToolbarMode, ToolbarFeature[]>;
/** features 배열 → Set 변환. features가 있으면 그걸 쓰고 없으면 toolbar 모드 프리셋 */
export declare function resolveFeatures(toolbar: ToolbarMode, features?: ToolbarFeature[]): Set<ToolbarFeature>;
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
    icon: Component<{
        size?: number;
    }>;
    command: (editor: Editor) => void;
}
//# sourceMappingURL=types.d.ts.map