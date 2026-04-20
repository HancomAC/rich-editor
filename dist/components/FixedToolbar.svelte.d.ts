import type { Editor } from "@tiptap/core";
import type { ToolbarFeature, PromptHandler } from "../types";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    onFileClick?: () => void;
    onVideoClick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
};
declare const FixedToolbar: import("svelte").Component<$$ComponentProps, {}, "">;
type FixedToolbar = ReturnType<typeof FixedToolbar>;
export default FixedToolbar;
//# sourceMappingURL=FixedToolbar.svelte.d.ts.map