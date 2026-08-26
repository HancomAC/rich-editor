type $$ComponentProps = {
    latex?: string;
    displayMode?: boolean;
    /** 빈 문자열로 확인하면 호출부가 노드를 지운다(편집 중일 때). */
    onConfirm: (value: string) => void;
    onCancel: () => void;
};
declare const MathModal: import("svelte").Component<$$ComponentProps, {}, "">;
type MathModal = ReturnType<typeof MathModal>;
export default MathModal;
//# sourceMappingURL=MathModal.svelte.d.ts.map