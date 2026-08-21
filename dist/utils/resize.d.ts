import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
/**
 * 노드뷰에 드래그 리사이즈 손잡이를 단다.
 *
 * 원래 `PdfBlock` 과 `MbusVideo` 가 **같은 코드를 복붙**해서 각자 들고 있었다(변수명·매직넘버·
 * cssText 문자열까지 동일). 세 번째 소비자(카드)가 생기면서 한 곳으로 모은다.
 *
 * 합치면서 세 가지가 달라졌다:
 *
 * 1. **세로 축이 생겼다.** 기존 둘은 가로(폭)만 있었다. 카드·접기처럼 내용이 흐르는 블록은
 *    폭보다 높이를 잡고 싶다.
 * 2. **`node` 를 getter 로 받는다.** 기존 코드는 `addNodeView` 클로저가 잡은 `node` 를 그대로
 *    `setNodeMarkup(pos, undefined, {...node.attrs, width})` 에 썼다. 그 사이 다른 속성이
 *    바뀌었으면 **리사이즈가 그 변경을 되돌려 버린다.** 항상 최신 노드를 읽도록 바꿨다.
 * 3. **정리 함수를 돌려준다.** 기존엔 `destroy()` 에서 손잡이 리스너를 떼지 않았다.
 *
 * ⚠️ 손잡이는 `position:absolute` 로 노드뷰 밖 12px 을 침범한다. 부모가 `overflow:hidden` 이면
 *    잘려서 안 보인다(`editor.css` 가 `padding-right:4px` 로 땜빵 중인 이유).
 */
export type ResizeAxis = "x" | "y";
export interface AttachResizeOptions {
    /** 크기를 실제로 먹일 요소. 보통 노드뷰 루트(`dom`). */
    dom: HTMLElement;
    editor: Editor;
    getPos: () => number | undefined;
    /** ⚠️ 값이 아니라 **getter**. 클로저가 낡은 노드를 잡는 것을 막는다. */
    getNode: () => ProseMirrorNode;
    /** 기본 `'x'`(폭). `'y'` 면 높이를 조절한다. */
    axis?: ResizeAxis;
    /** 크기를 저장할 노드 속성 이름. 기본은 축에 따라 `width` / `height`. */
    attr?: string;
    min?: number;
    max?: number;
    /** 스크린리더용 이름. 예: `'PDF 너비 조절'` */
    label?: string;
    /** 저장 형식. 기본은 `'240px'` 같은 px 문자열. */
    format?: (value: number) => string;
}
export declare function attachResize(options: AttachResizeOptions): () => void;
//# sourceMappingURL=resize.d.ts.map