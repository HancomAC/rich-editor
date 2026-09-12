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
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
/** 노드 이름이자 직렬화 태그 이름. `utils/sanitize.ts` 의 제거 규칙과 짝이다. */
export const UPLOAD_SKELETON_NODE = "tiptap-upload-skeleton";
/** 실제 노드가 설 때의 대략적 높이 — 교체 순간 문서가 덜 출렁이게 한다. */
const DEFAULT_HEIGHT = {
    image: 220,
    file: 56,
    pdf: 420,
    embed: 420,
    block: 180
};
const MIN_HEIGHT = 44;
const MAX_HEIGHT = 1200;
function clampHeight(value) {
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(value)));
}
function findUploadSkeleton(doc, id) {
    let target = null;
    doc.descendants((node, pos) => {
        if (node.type.name !== UPLOAD_SKELETON_NODE)
            return;
        if (node.attrs.uploadId !== id)
            return;
        target = { pos, node };
        return false;
    });
    return target;
}
function tryCreateNodeSelection(doc, pos) {
    if (pos < 0 || pos > doc.content.size)
        return null;
    const node = doc.nodeAt(pos);
    if (!node || node.type.spec.selectable === false)
        return null;
    try {
        return NodeSelection.create(doc, pos);
    }
    catch {
        return null;
    }
}
/**
 * 스켈레톤을 세우고 교체/제거 핸들을 돌려준다. 스키마에 노드가 없으면(확장 미등록)
 * `null` — 호출부는 그때만 다른 진행 표시로 물러난다.
 */
export function insertUploadSkeleton(editor, { kind = "block", height = DEFAULT_HEIGHT[kind], at, select = true, insertParagraph = true } = {}) {
    const getState = () => editor.view.state;
    const skeletonType = getState().schema.nodes[UPLOAD_SKELETON_NODE];
    if (!skeletonType)
        return null;
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const node = skeletonType.create({ uploadId, kind, height: clampHeight(height) });
    const paragraph = getState().schema.nodes.paragraph?.create();
    const state = getState();
    const rawPos = Math.max(0, Math.min(at ?? state.selection.from, state.doc.content.size));
    /*
     * ⚠️ 문단 한가운데 그대로 꽂으면 replace 맞춤이 문단을 **쪼개서** 빈 문단 부스러기를
     * 남긴다(`<p></p>` 가 앞에 하나 더 선다 — 제거해도 안 사라지는 흔적). 텍스트블록
     * 안이면 그 블록의 경계로 옮긴다: 빈 블록이면 앞(그 자리를 차지), 아니면 뒤(쓰던
     * 문단 다음).
     */
    let safePos = rawPos;
    const $pos = state.doc.resolve(rawPos);
    if ($pos.depth > 0 && $pos.parent.isTextblock) {
        safePos = $pos.parent.content.size === 0 ? $pos.before() : $pos.after();
    }
    let tr;
    try {
        tr = state.tr.insert(safePos, node);
    }
    catch {
        /* 스키마가 이 자리를 거부하면(중첩 구조 등) 세우지 않는다 — 호출부가 물러난다. */
        return null;
    }
    /*
     * ⚠️ `safePos` 를 그대로 믿으면 안 된다. 커서가 문단 **안**이면 ProseMirror 의 replace
     * 맞춤이 블록을 문단 밖(앞)으로 밀어 넣어 실제 자리가 어긋난다 — 그 상태로 `safePos`
     * 기준으로 문단을 심으면 엉뚱한 문단이 쪼개지고, 선택도 스켈레톤을 못 잡는다.
     * 방금 넣은 노드를 id 로 되찾아 **실제 자리**를 기준으로 삼는다.
     */
    const inserted = findUploadSkeleton(tr.doc, uploadId);
    if (insertParagraph && paragraph && inserted) {
        tr.insert(inserted.pos + inserted.node.nodeSize, paragraph);
    }
    if (select && inserted) {
        const nodeSelection = tryCreateNodeSelection(tr.doc, inserted.pos);
        if (nodeSelection)
            tr.setSelection(nodeSelection);
    }
    editor.view.dispatch(tr);
    return {
        id: uploadId,
        exists: () => Boolean(findUploadSkeleton(getState().doc, uploadId)),
        replaceWith: (content, options = {}) => {
            const state = getState();
            const target = findUploadSkeleton(state.doc, uploadId);
            if (!target)
                return false;
            if (!content?.type)
                return false;
            let nextNode;
            try {
                nextNode = state.schema.nodeFromJSON(content);
            }
            catch {
                return false;
            }
            const tr = state.tr.replaceWith(target.pos, target.pos + target.node.nodeSize, nextNode);
            if (options.select ?? true) {
                const nodeSelection = tryCreateNodeSelection(tr.doc, target.pos);
                if (nodeSelection)
                    tr.setSelection(nodeSelection);
            }
            editor.view.dispatch(tr);
            return true;
        },
        remove: () => {
            const state = getState();
            const target = findUploadSkeleton(state.doc, uploadId);
            if (!target)
                return false;
            const removeFrom = target.pos;
            let removeTo = target.pos + target.node.nodeSize;
            /* 함께 심었던 빈 문단도 걷는다 — 실패했는데 빈 줄만 남으면 티가 난다. */
            const nextNode = state.doc.nodeAt(removeTo);
            if (nextNode?.type.name === "paragraph" && nextNode.content.size === 0) {
                removeTo += nextNode.nodeSize;
            }
            editor.view.dispatch(state.tr.deleteRange(removeFrom, removeTo));
            return true;
        }
    };
}
export const UploadSkeleton = Node.create({
    name: UPLOAD_SKELETON_NODE,
    group: "block",
    atom: true,
    draggable: false,
    selectable: true,
    addAttributes() {
        return {
            uploadId: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-upload-id"),
                renderHTML: (attributes) => attributes.uploadId ? { "data-upload-id": attributes.uploadId } : {}
            },
            kind: {
                default: "block",
                parseHTML: (element) => element.getAttribute("data-upload-kind") || "block",
                renderHTML: (attributes) => attributes.kind ? { "data-upload-kind": attributes.kind } : {}
            },
            height: {
                default: DEFAULT_HEIGHT.block,
                parseHTML: (element) => {
                    const value = Number.parseInt(element.getAttribute("data-upload-height") || "", 10);
                    return Number.isFinite(value) ? value : DEFAULT_HEIGHT.block;
                },
                renderHTML: (attributes) => {
                    const raw = Number.parseFloat(String(attributes.height ?? DEFAULT_HEIGHT.block));
                    const height = Number.isFinite(raw) ? clampHeight(raw) : DEFAULT_HEIGHT.block;
                    return { "data-upload-height": String(height) };
                }
            }
        };
    },
    parseHTML() {
        return [{ tag: UPLOAD_SKELETON_NODE }];
    },
    /*
     * ⚠️ `renderHTML` 은 빈 커스텀 태그 하나만 내보낸다 — 내용이 없으니 새어 나가도
     * 화면에 아무것도 못 그리고, `stripUploadSkeletonHtml`(내보내기)·`transformLegacyHtml`
     * (읽기)·`sanitizeHtml`(정적 렌더) 세 군데가 이 태그를 지운다.
     */
    renderHTML({ HTMLAttributes }) {
        return [UPLOAD_SKELETON_NODE, mergeAttributes(HTMLAttributes)];
    },
    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement("div");
            dom.className = "hce-upload-skeleton";
            dom.setAttribute("data-node-view-wrapper", "");
            dom.contentEditable = "false";
            const shine = document.createElement("div");
            shine.className = "hce-upload-skeleton-shine";
            dom.appendChild(shine);
            for (const row of ["top", "mid", "low"]) {
                const bar = document.createElement("div");
                bar.className = `hce-upload-skeleton-bar is-${row}`;
                dom.appendChild(bar);
            }
            const apply = (current) => {
                const rawKind = current.attrs.kind;
                const kind = typeof rawKind === "string" && rawKind.trim().length ? rawKind : "block";
                dom.setAttribute("data-kind", kind);
                const raw = Number.parseFloat(String(current.attrs.height ?? ""));
                dom.style.height = `${clampHeight(Number.isFinite(raw) ? raw : DEFAULT_HEIGHT.block)}px`;
            };
            apply(node);
            return {
                dom,
                update: (updated) => {
                    if (updated.type.name !== UPLOAD_SKELETON_NODE)
                        return false;
                    apply(updated);
                    return true;
                }
            };
        };
    }
});
