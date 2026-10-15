import { type EditorTranslator } from "../i18n";
import type { MathAlign } from "../extensions/Math";
type $$ComponentProps = {
    latex?: string;
    displayMode?: boolean;
    /** 수식 블록 정렬. `undefined` 면 정렬을 고를 수 없는 자리라 버튼을 숨긴다. */
    align?: MathAlign;
    /** 빈 문자열로 확인하면 호출부가 노드를 지운다(편집 중일 때). */
    onConfirm: (value: string, align?: MathAlign) => void;
    onCancel: () => void;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
};
declare const MathModal: import("svelte").Component<$$ComponentProps, {}, "">;
type MathModal = ReturnType<typeof MathModal>;
export default MathModal;
//# sourceMappingURL=MathModal.svelte.d.ts.map