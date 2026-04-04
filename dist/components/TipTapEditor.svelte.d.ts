import { type AnyExtension } from "@tiptap/core";
import type { UploadHandler } from "../types";
type $$ComponentProps = {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onUploadFile?: UploadHandler;
    extensions?: AnyExtension[];
    editable?: boolean;
};
declare const TipTapEditor: import("svelte").Component<$$ComponentProps, {}, "">;
type TipTapEditor = ReturnType<typeof TipTapEditor>;
export default TipTapEditor;
//# sourceMappingURL=TipTapEditor.svelte.d.ts.map