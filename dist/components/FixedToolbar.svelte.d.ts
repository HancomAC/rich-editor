import type { Editor } from "@tiptap/core";
import type { ToolbarFeature } from "../types";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    onFileClick?: () => void;
    onVideoClick?: () => void;
};
declare const FixedToolbar: import("svelte").Component<$$ComponentProps, {}, "">;
type FixedToolbar = ReturnType<typeof FixedToolbar>;
export default FixedToolbar;
//# sourceMappingURL=FixedToolbar.svelte.d.ts.map