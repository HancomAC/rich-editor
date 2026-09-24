import { type EditorTranslator } from "../i18n";
type $$ComponentProps = {
    title: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
};
declare const InputModal: import("svelte").Component<$$ComponentProps, {}, "">;
type InputModal = ReturnType<typeof InputModal>;
export default InputModal;
//# sourceMappingURL=InputModal.svelte.d.ts.map