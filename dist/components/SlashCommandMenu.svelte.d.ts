import type { Editor } from "@tiptap/core";
import type { ToolbarFeature } from "../types";
import type { Component } from "svelte";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
    onFileUpload?: () => void;
    onVideoUpload?: () => void;
};
declare const SlashCommandMenu: Component<$$ComponentProps, {}, "">;
type SlashCommandMenu = ReturnType<typeof SlashCommandMenu>;
export default SlashCommandMenu;
//# sourceMappingURL=SlashCommandMenu.svelte.d.ts.map