import * as react_jsx_runtime from 'react/jsx-runtime';
import { Editor } from '@tiptap/react';
import { Node } from '@tiptap/core';
import { ClassValue } from 'clsx';

/** 파일 업로드 핸들러 — 호스트 앱에서 구현 */
type UploadHandler = (file: File) => Promise<string>;
interface TipTapEditorProps$1 {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    /** 이미지/PDF 파일 업로드 시 호출. URL을 반환해야 함 */
    onUploadFile?: UploadHandler;
}
interface FixedToolbarProps$1 {
    editor: Editor;
    onPdfClick: () => void;
}
interface BlockHandleProps$1 {
    editor: Editor;
}
interface SlashCommandMenuProps$1 {
    editor: Editor;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
}
interface PdfViewerProps$1 {
    src: string;
    fileName?: string;
}
interface SlashMenuItem {
    label: string;
    keywords: string;
    icon: React.ReactNode;
    command: (editor: Editor) => void;
}

interface TipTapEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    /** 파일 업로드 핸들러. File을 받아 업로드된 URL을 반환 */
    onUploadFile?: UploadHandler;
}
declare function TipTapEditor({ content, onChange, placeholder, onUploadFile, }: TipTapEditorProps): react_jsx_runtime.JSX.Element | null;

interface FixedToolbarProps {
    editor: Editor;
    onPdfClick: () => void;
}
declare function FixedToolbar({ editor, onPdfClick }: FixedToolbarProps): react_jsx_runtime.JSX.Element;

interface BubbleToolbarProps {
    editor: Editor;
}
declare function BubbleToolbar({ editor }: BubbleToolbarProps): react_jsx_runtime.JSX.Element;

interface BlockHandleProps {
    editor: Editor;
    onPlusClick?: (pos: {
        top: number;
        left: number;
    }) => void;
}
declare function BlockHandle(_props: BlockHandleProps): null;

declare const SLASH_MENU_ITEMS: SlashMenuItem[];
interface SlashCommandMenuProps {
    editor: Editor;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
}
declare function SlashCommandMenu({ editor, query, onClose, onPdfUpload, }: SlashCommandMenuProps): react_jsx_runtime.JSX.Element;

interface InputModalProps {
    title: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}
declare function InputModal({ title, placeholder, defaultValue, onConfirm, onCancel, }: InputModalProps): react_jsx_runtime.JSX.Element;

interface PdfViewerProps {
    src: string;
    fileName?: string;
}
declare function PdfViewer({ src, fileName }: PdfViewerProps): react_jsx_runtime.JSX.Element;

declare function TableBubbleMenu({ editor }: {
    editor: Editor;
}): react_jsx_runtime.JSX.Element | null;

declare const PdfBlock: Node<any, any>;

declare function sanitizeHtml(html: string): string;
declare function stripHtmlToExcerpt(html: string, maxLen?: number): string;

interface PdfJsConfig {
    /** pdf.min.mjs 경로 (기본: "/pdf.min.mjs") */
    pdfSrc?: string;
    /** pdf.worker.min.mjs 경로 (기본: "/pdf.worker.min.mjs") */
    workerSrc?: string;
}
declare function configurePdfJs(cfg: PdfJsConfig): void;
declare function getPdfJs(): Promise<any>;

declare function cn(...inputs: ClassValue[]): string;

export { BlockHandle, type BlockHandleProps$1 as BlockHandleProps, BubbleToolbar, FixedToolbar, type FixedToolbarProps$1 as FixedToolbarProps, InputModal, PdfBlock, PdfViewer, type PdfViewerProps$1 as PdfViewerProps, SLASH_MENU_ITEMS, SlashCommandMenu, type SlashCommandMenuProps$1 as SlashCommandMenuProps, type SlashMenuItem, TableBubbleMenu, TipTapEditor, type TipTapEditorProps$1 as TipTapEditorProps, type UploadHandler, cn, configurePdfJs, getPdfJs, sanitizeHtml, stripHtmlToExcerpt };
