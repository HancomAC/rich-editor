type $$ComponentProps = {
    title: string;
    /** 파일 선택창에서 거를 확장자. 파일 첨부처럼 아무거나 받는 곳은 비운다. */
    accept?: string;
    uploadLabel: string;
    linkPlaceholder: string;
    linkConfirmLabel: string;
    /** 링크 탭 아래 작은 안내문. 없으면 안 그린다. */
    linkHint?: string;
    /** 고른 파일을 부모가 올리고 문서에 꽂는다. 끝나면 모달을 닫는 것도 부모 몫. */
    onUpload: (file: File) => void;
    onLink: (url: string) => void;
    onCancel: () => void;
};
declare const MediaPickerModal: import("svelte").Component<$$ComponentProps, {}, "">;
type MediaPickerModal = ReturnType<typeof MediaPickerModal>;
export default MediaPickerModal;
//# sourceMappingURL=MediaPickerModal.svelte.d.ts.map