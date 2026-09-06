/**
 * 어떤 꼴로 들어오든 단위 없는 px 정수로 만든다. 못 읽으면 `null`.
 *
 * `%`·`em`·`auto` 처럼 px 로 환산할 수 없는 값은 **버린다**. 억지로 숫자를 뽑으면
 * `50%` 가 `50px` 이 되어 이미지가 손톱만 해진다.
 */
export declare function normalizeImageWidth(value: unknown): number | null;
export declare const ResizableImage: import("@tiptap/core").Node<import("@tiptap/extension-image").ImageOptions, any>;
export default ResizableImage;
//# sourceMappingURL=ResizableImage.d.ts.map