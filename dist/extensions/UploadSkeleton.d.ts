/**
 * 업로드 자리표시자 — 업로드가 도는 동안 **삽입 지점에** 서는 회색 스켈레톤 블록.
 * (main 정올 `plugin/upload/skeleton` 참조 — Svelte NodeView 를 vanilla 로 재작성.)
 *
 * 전체 화면 오버레이(`업로드 중...`)와 달리 문서 안 제자리에 서므로, 업로드가 도는
 * 동안에도 커서를 옮기고 다른 곳을 편집할 수 있다. 흐름은 세 동작이 전부다:
 *
 *   1. `insertUploadSkeleton(editor, { kind })` → 스켈레톤이 서고 핸들을 돌려받는다
 *   2. 성공: `handle.replaceWith({ type: "image", attrs: { src } })` — 그 자리가 실제 노드로
 *   3. 실패: `handle.remove()` — 흔적 없이 사라진다
 *
 * 핸들은 위치가 아니라 **`uploadId` 로 노드를 다시 찾는다.** 업로드가 도는 몇 초 사이
 * 사용자가 위쪽에 글을 쓰면 위치가 밀리는데, id 로 찾으면 어디로 밀렸든 맞는 자리를
 * 바꾼다. 그 사이 사용자가 스켈레톤을 지웠으면 조용히 `false` 를 돌려준다.
 *
 * ⚠️ **저장 HTML 에 남으면 안 된다.** 스켈레톤은 "업로드 중" 이라는 화면 상태지 내용이
 * 아니다. 세 겹으로 막는다 — ① `TipTapEditor` 가 `onChange` 로 내보내기 전에
 * `stripUploadSkeletonHtml` 로 걷어내고, ② 문서를 열 때 `transformLegacyHtml` 이 같은
 * 태그를 지우며(과거에 새어 나간 것 정리), ③ 정적 렌더의 `sanitizeHtml` 허용 목록에
 * 이 태그가 없다. 셋 다 `utils/sanitize.ts` 와 태그 이름(`tiptap-upload-skeleton`)으로
 * 정합을 맞춘다 — 이름을 바꾸면 그쪽 규칙도 함께 바꿔야 한다.
 */
import { Node, type Editor, type JSONContent } from "@tiptap/core";
/** 노드 이름이자 직렬화 태그 이름. `utils/sanitize.ts` 의 제거 규칙과 짝이다. */
export declare const UPLOAD_SKELETON_NODE = "tiptap-upload-skeleton";
/** 실제 노드가 설 때의 대략적 높이 — 교체 순간 문서가 덜 출렁이게 한다. */
declare const DEFAULT_HEIGHT: {
    readonly image: 220;
    readonly file: 56;
    readonly pdf: 420;
    readonly embed: 420;
    readonly block: 180;
};
export type UploadSkeletonKind = keyof typeof DEFAULT_HEIGHT;
export interface InsertUploadSkeletonOptions {
    kind?: UploadSkeletonKind;
    height?: number;
    /** 삽입 위치. 생략하면 현재 선택 위치. */
    at?: number;
    select?: boolean;
    /** 스켈레톤 뒤에 빈 문단을 하나 심는다 — 커서가 이어서 쓸 자리. 기본 켬. */
    insertParagraph?: boolean;
}
interface ReplaceOptions {
    select?: boolean;
}
type EditorLike = Pick<Editor, "view">;
export interface UploadSkeletonHandle {
    id: string;
    exists: () => boolean;
    replaceWith: (content: JSONContent, options?: ReplaceOptions) => boolean;
    remove: () => boolean;
}
/**
 * 스켈레톤을 세우고 교체/제거 핸들을 돌려준다. 스키마에 노드가 없으면(확장 미등록)
 * `null` — 호출부는 그때만 다른 진행 표시로 물러난다.
 */
export declare function insertUploadSkeleton(editor: EditorLike, { kind, height, at, select, insertParagraph }?: InsertUploadSkeletonOptions): UploadSkeletonHandle | null;
export declare const UploadSkeleton: Node<any, any>;
export {};
//# sourceMappingURL=UploadSkeleton.d.ts.map