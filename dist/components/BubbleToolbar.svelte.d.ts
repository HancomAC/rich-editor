import type { Editor } from "@tiptap/core";
import type { ToolbarFeature, PromptHandler } from "../types";
import { type EditorTranslator } from "../i18n";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPromptLink?: PromptHandler;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
};
declare const BubbleToolbar: import("svelte").Component<$$ComponentProps, {}, "">;
type BubbleToolbar = ReturnType<typeof BubbleToolbar>;
export default BubbleToolbar;
//# sourceMappingURL=BubbleToolbar.svelte.d.ts.map