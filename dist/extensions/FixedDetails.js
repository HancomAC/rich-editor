/**
 * Details 확장의 토글 버그 수정 래퍼.
 *
 * 원본 문제:
 * 1. persist:false → focus() 호출로 노드 뷰 재생성 → is-open 클래스 소실
 * 2. persist:true  → getPos()===0일 때 !pos가 true → 상태 저장 실패
 *
 * 해결: addNodeView를 오버라이드하여 토글 로직을 직접 구현.
 */
import { Details } from "@tiptap/extension-details";
import { mergeAttributes } from "@tiptap/core";
export const FixedDetails = Details.extend({
    addOptions() {
        return {
            ...this.parent?.(),
            persist: false,
            openClassName: "is-open",
        };
    },
    addNodeView() {
        return ({ editor, getPos, node: initialNode, HTMLAttributes }) => {
            let currentNode = initialNode;
            const dom = document.createElement("div");
            const attributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                "data-type": this.name,
            });
            Object.entries(attributes).forEach(([key, value]) => dom.setAttribute(key, value));
            // 토글 버튼
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.setAttribute("aria-label", "Expand details content");
            dom.append(toggle);
            // 콘텐츠 래퍼
            const content = document.createElement("div");
            dom.append(content);
            let isOpen = Boolean(initialNode.attrs.open);
            const applyState = () => {
                if (isOpen) {
                    dom.classList.add(this.options.openClassName);
                    toggle.setAttribute("aria-label", "Collapse details content");
                }
                else {
                    dom.classList.remove(this.options.openClassName);
                    toggle.setAttribute("aria-label", "Expand details content");
                }
                const detailsContent = content.querySelector(':scope > div[data-type="detailsContent"]');
                if (detailsContent) {
                    if (isOpen) {
                        detailsContent.removeAttribute("hidden");
                    }
                    else {
                        detailsContent.setAttribute("hidden", "hidden");
                    }
                }
            };
            // 초기 상태 즉시 적용 (클래스는 바로 설정, detailsContent는 아직 없을 수 있으므로 update에서도 처리)
            applyState();
            toggle.addEventListener("click", (e) => {
                e.preventDefault();
                isOpen = !isOpen;
                applyState();
                // focus()를 호출하지 않아 노드 뷰 재생성을 방지
            });
            return {
                dom,
                contentDOM: content,
                ignoreMutation(mutation) {
                    if (mutation.type === "selection")
                        return false;
                    // dom 자체(클래스 변경)와 dom 내부 비-콘텐츠 영역(hidden 토글 등)의
                    // 변경을 무시해야 ProseMirror가 노드 뷰를 재생성하지 않음.
                    // contentDOM(content) 내부의 ProseMirror 관리 영역만 통과시킴.
                    if (!dom.contains(mutation.target))
                        return true;
                    if (dom === mutation.target)
                        return true;
                    if (toggle.contains(mutation.target) || toggle === mutation.target)
                        return true;
                    // detailsContent의 hidden 속성 변경 무시
                    if (mutation.type === "attributes" &&
                        mutation.attributeName === "hidden")
                        return true;
                    return false;
                },
                update: (updatedNode) => {
                    if (updatedNode.type !== this.type)
                        return false;
                    const attrsChanged = updatedNode.attrs.open !== currentNode.attrs.open;
                    currentNode = updatedNode;
                    if (attrsChanged) {
                        isOpen = Boolean(updatedNode.attrs.open);
                    }
                    // 항상 applyState 호출 — detailsContent가 나중에 렌더링될 수 있으므로
                    applyState();
                    return true;
                },
            };
        };
    },
});
