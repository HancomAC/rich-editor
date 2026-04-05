import { type AnyExtension } from "@tiptap/core";
import type { UploadHandler, ToolbarMode } from "../types";
import type { FileResolver } from "../extensions/FileAttachment";
type $$ComponentProps = {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onUploadFile?: UploadHandler;
    onResolveFile?: FileResolver;
    extensions?: AnyExtension[];
    editable?: boolean;
    toolbar?: ToolbarMode;
};
declare const TipTapEditor: import("svelte").Component<$$ComponentProps, {}, "">;
type TipTapEditor = ReturnType<typeof TipTapEditor>;
export default TipTapEditor;
//# sourceMappingURL=TipTapEditor.svelte.d.ts.map