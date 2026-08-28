import type { Editor } from "@tiptap/core";
import type { ToolbarFeature, PromptHandler } from "../types";
import type { Component } from "svelte";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
    onFileUpload?: () => void;
    /**
     * 이미지 넣기 — 툴바의 `이미지` 와 **같은 모달**을 연다(에디터가 띄운다).
     * 없으면 아래 항목의 기본 동작(`window.prompt`)으로 떨어진다.
     */
    onImagePick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /**
     * 영상 URL 프롬프트. 없으면 아래 항목의 `window.prompt` 로 떨어지는데, 그건 브라우저
     * 기본 대화상자라 화면이 멈추고 앱과 모양이 따로 논다(사용자 지적).
     */
    onPromptVideo?: PromptHandler;
};
declare const SlashCommandMenu: Component<$$ComponentProps, {}, "">;
type SlashCommandMenu = ReturnType<typeof SlashCommandMenu>;
export default SlashCommandMenu;
//# sourceMappingURL=SlashCommandMenu.svelte.d.ts.map