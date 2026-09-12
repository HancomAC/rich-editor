import type { Snippet } from "svelte";
import type { AnyExtension } from "@tiptap/core";
import { type MidibusRenderer } from "../extensions/TiptapMidibus";
import { type LegacyBlockRenderer } from "../extensions/LegacyBlock";
import { type MathPrompt } from "../extensions/Math";
import type { UploadHandler, PromptHandler, ToolbarMode, ToolbarFeature } from "../types";
import { type EditorLocaleInput } from "../i18n";
import type { FileResolver } from "../extensions/FileAttachment";
type $$ComponentProps = {
    content: string;
    onChange: (html: string) => void;
    /** 본문 안내문. 미지정 시 로케일의 기본 안내문(ko: "'/'를 눌러 명령어를 입력하세요..."). */
    placeholder?: string;
    /**
     * 에디터 UI 로케일 — 코드('ko'·'en'·'ja'·'es'·'zh-hans'·'zh-hant', 지역 변형 허용) 또는
     * 부분 메시지 오버라이드 객체. **미주입 시 ko** — 기존 호스트와 픽셀 단위 동일(하위호환).
     */
    locale?: EditorLocaleInput;
    onUploadFile?: UploadHandler;
    onResolveFile?: FileResolver;
    fileDownloadBaseUrl?: string;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /** 영상(유튜브·Vimeo 등) URL 프롬프트. 미제공 시 내장 InputModal 폴백 */
    onPromptVideo?: PromptHandler;
    /** 카드 배경 고르기. 미제공 시 window.prompt 폴백 */
    onPromptCardBackground?: PromptHandler;
    /** LaTeX 수식 편집. 미제공 시 내장 MathModal(실시간 미리보기) 폴백 */
    onPromptMath?: MathPrompt;
    /**
     * 정올 prod 형식 `<tiptap-midibus>` 를 **실제로 재생**할 플레이어.
     *
     * 패키지는 노드와 마크업만 책임지고, 플레이어는 호스트가 준다 — prod 플레이어가
     * 로그인 계정 id·`GET /midibus/start/{id}`·PIP 헬퍼를 쓰기 때문이다(`resolver` 와
     * 같은 패턴). 미제공 시 읽기 전용 자리표시자로 폴백한다.
     */
    onRenderMidibus?: MidibusRenderer;
    /**
     * 옛 블록(`lite-youtube`·`div.iframe-wrapper`·`div.tiptap-columns`)을 실제로 그릴 렌더러.
     * `kind` 를 보고 아는 것만 그리고 나머지는 `false` 로 사양하면 된다.
     */
    onRenderLegacyBlock?: LegacyBlockRenderer;
    /** 고정 툴바 오른쪽 끝에 끼워 넣을 조각 */
    toolbarEnd?: Snippet;
    extensions?: AnyExtension[];
    editable?: boolean;
    toolbar?: ToolbarMode;
    features?: ToolbarFeature[];
};
declare const TipTapEditor: import("svelte").Component<$$ComponentProps, {}, "">;
type TipTapEditor = ReturnType<typeof TipTapEditor>;
export default TipTapEditor;
//# sourceMappingURL=TipTapEditor.svelte.d.ts.map