import type { Snippet } from "svelte";
import { type AnyExtension } from "@tiptap/core";
import type { UploadHandler, PromptHandler, ToolbarMode, ToolbarFeature } from "../types";
import type { FileResolver } from "../extensions/FileAttachment";
type $$ComponentProps = {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onUploadFile?: UploadHandler;
    onResolveFile?: FileResolver;
    fileDownloadBaseUrl?: string;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /** 카드 배경 고르기. 미제공 시 window.prompt 폴백 */
    onPromptCardBackground?: PromptHandler;
    /** 고정 툴바 오른쪽 끝에 끼워 넣을 조각 */
    toolbarEnd?: Snippet;
    extensions?: AnyExtension[];
    editable?: boolean;
    toolbar?: ToolbarMode;
    features?: ToolbarFeature[];
};
declare const TipTapEditor: import("svelte").Component<$$ComponentProps, {}, "">;
type TipTapEditor = ReturnType<typeof TipTapEditor>;
export default TipTapEditor;
//# sourceMappingURL=TipTapEditor.svelte.d.ts.map