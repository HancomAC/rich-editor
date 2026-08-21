import type { Editor } from "@tiptap/core";
import type { Snippet } from "svelte";
import type { ToolbarFeature, PromptHandler } from "../types";
type $$ComponentProps = {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    onFileClick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /**
     * 툴바 **오른쪽 끝**에 호스트가 끼워 넣는 조각(예: HTML ↔ 에디터 토글).
     *
     * 이게 없으면 호스트는 툴바 위에 `position: absolute` 로 띄우는 수밖에 없는데,
     * 그러면 툴바 버튼들과 세로 정렬이 맞지 않고(사용자 지적) 좁은 폭에서는 겹친다.
     * 여기에 넣으면 툴바의 flex 행에 그대로 얹혀 정렬이 저절로 맞는다.
     */
    toolbarEnd?: Snippet;
};
declare const FixedToolbar: import("svelte").Component<$$ComponentProps, {}, "">;
type FixedToolbar = ReturnType<typeof FixedToolbar>;
export default FixedToolbar;
//# sourceMappingURL=FixedToolbar.svelte.d.ts.map