import type { Editor } from "@tiptap/core";
import type { ToolbarFeature, PromptHandler } from "../types";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    onFileClick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
};
declare const FixedToolbar: import("svelte").Component<$$ComponentProps, {}, "">;
type FixedToolbar = ReturnType<typeof FixedToolbar>;
export default FixedToolbar;
//# sourceMappingURL=FixedToolbar.svelte.d.ts.map