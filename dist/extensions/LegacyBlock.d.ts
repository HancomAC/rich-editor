/**
 * 정올 prod 에만 있는 옛 블록 셋을 **원본 마크업 그대로 품는** 보존용 노드.
 *
 * - `<lite-youtube videoid=…>` — 유튜브 파사드 커스텀 엘리먼트 (prod 1 건)
 * - `<div class="iframe-wrapper"><iframe …></div>` — 옛 임베드 (prod 69 건, 사멸 추세)
 * - `<div class="tiptap-columns"><div class="tiptap-column">…</div></div>` — 옛 단 (prod 1 건)
 *
 * ⚠️ **왜 편집 가능한 노드로 바꾸지 않는가.** 정올 prod 와 lms 는 같은 Datastore 를
 * 공유한다. 옛 단을 `Columns`(`div[data-type="columns"]`) 로 바꿔 저장하면 lms 에서는
 * 잘 보이지만 **이번엔 prod 에디터가 그 형식을 모른다** — 손해를 반대로 옮길 뿐이다.
 * 그래서 이 노드는 읽은 그대로 되쓴다: `parseHTML` 이 DOM 을 그대로 옮긴 명세(spec)로
 * 뜨고, `renderHTML` 이 그 명세를 되돌려준다. 편집은 못 하지만 **아무것도 잃지 않는다.**
 *
 * ⚠️ **셀렉터 우선순위.** `Columns`/`Column` 에 이미 `div.tiptap-columns`·`div.tiptap-column`
 * 규칙이 있다(기본 우선순위 50). 여기 규칙에 100 을 줘서 먼저 잡히게 한다. 그리고
 * `transformLegacyHtml` 이 `class="tiptap-columns"` 를 `data-type="columns"` 로 미리
 * 바꿔 버리면 여기까지 오지도 못하므로, 그 치환은 함께 제거했다(`utils/sanitize.ts`).
 *
 * ⚠️ **바이트 보존의 한계 하나.** `editor.getHTML()` 은 결국 DOM 을 거쳐 직렬화되므로
 * 값 없는 속성(`allowfullscreen`)은 `allowfullscreen=""` 로 정규화된다. prod 저장본도
 * 같은 경로(`getHTML()`)로 만들어져 이미 `=""` 꼴이라 실사용에서는 어긋나지 않는다.
 */
import { Node, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
/** ProseMirror `DOMOutputSpec` 과 같은 모양이되 **JSON 으로 저장 가능한** 형태. */
export type LegacySpec = string | LegacySpecElement;
export type LegacySpecElement = [string, Record<string, string>, ...LegacySpec[]];
export type LegacyBlockKind = "youtube" | "iframe" | "columns";
/**
 * 호스트가 이 옛 블록을 **살려서 그리고 싶을 때** 받는 것.
 *
 * ⚠️ 세 종류가 한 노드에 묶여 있으므로 `kind` 를 보고 **아는 것만 그리고 나머지는
 * `false` 로 사양**하면 된다. 정올 lms 는 `youtube` 만 그리고 `iframe`·`columns` 는
 * 사양해 자리표시자를 그대로 쓴다.
 */
export interface LegacyBlockRenderContext {
    /** 그려 넣을 빈 칸. 노드뷰가 만들어 준다(자리표시자 테두리는 아직 안 붙었다). */
    element: HTMLElement;
    kind: LegacyBlockKind;
    /** 저장된 원본 마크업. 여기서 `videoid`·`src` 를 꺼내 쓴다. */
    spec: LegacySpecElement | null;
    node: ProseMirrorNode;
    editor: Editor;
}
/** 치울 함수를 돌려주거나, `false` 로 사양하면 자리표시자로 되돌아간다. */
export type LegacyBlockRenderResult = (() => void) | void | false;
export type LegacyBlockRenderer = (context: LegacyBlockRenderContext) => LegacyBlockRenderResult;
export interface LegacyBlockOptions {
    /**
     * 호스트가 심어 주는 실물 렌더러. 없거나 `false` 를 돌려주면 자리표시자.
     *
     * ⚠️ **주입은 화면만 바꾼다.** `renderHTML` 은 이 옵션을 보지 않고 `spec` 을 그대로
     * 되뱉으므로, 렌더러가 있어도 왕복 바이트는 같다. 테스트로 박아 뒀다.
     */
    renderer: LegacyBlockRenderer | null;
}
/**
 * DOM 요소를 저장 가능한 명세로 옮긴다. 속성은 **적힌 순서 그대로**, 자식은 텍스트까지
 * 그대로 옮긴다. `on*` 만 떨어뜨린다 — 그것까지 되쓰면 보존이 아니라 XSS 통로가 된다.
 */
export declare function elementToSpec(el: Element): LegacySpecElement;
export declare const LegacyBlock: Node<LegacyBlockOptions, any>;
//# sourceMappingURL=LegacyBlock.d.ts.map