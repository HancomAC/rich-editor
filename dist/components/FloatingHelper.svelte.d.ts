import type { Editor } from "@tiptap/core";
import type { ToolbarFeature } from "../types";
import { type EditorTranslator } from "../i18n";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    suppressed?: boolean;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
};
declare const FloatingHelper: import("svelte").Component<$$ComponentProps, {}, "">;
type FloatingHelper = ReturnType<typeof FloatingHelper>;
export default FloatingHelper;
//# sourceMappingURL=FloatingHelper.svelte.d.ts.map