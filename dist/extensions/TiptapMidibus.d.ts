/**
 * 정올 prod 저장 형식인 `<tiptap-midibus …>` 를 **그대로 읽고 그대로 되쓰는** 노드.
 *
 * ⚠️ **`MbusVideo` 와 다른 노드다.** 둘 다 mbus 영상이지만 저장 형식이 다르다 —
 * `MbusVideo` 는 lms(rich-editor) 가 만든 `div[data-mbus-src]` 이고, 이쪽은 정올 prod
 * 에디터(`@seorii/tiptap`)가 만든 커스텀 태그다. 정올 prod 와 lms 는 **같은 Datastore 를
 * 공유**하므로, 한쪽이 모르는 형식을 만나면 그 블록이 통째로 사라진다. 실제로 lms 에서
 * 강의영상 글을 열면 본문이 `<p>` 하나만 남고 비었다(prod 게시글·댓글 15,479 건 중
 * 181 건이 이 형식이고, 2026 년에도 51 건이 새로 쌓였다 — 사멸한 형식이 아니다).
 *
 * 그래서 이 노드의 계약은 **재생이 아니라 보존**이다:
 * 1. `parseHTML` 이 여는 태그의 속성을 **순서까지 그대로** `rawAttrs` 에 담는다.
 * 2. `renderHTML` 은 `rawAttrs` 가 있으면 그것을 그대로 되뱉는다 → 왕복에서 바이트 보존.
 * 3. 화면에는 **읽기 전용 자리표시자**만 세운다(아래 이유).
 *
 * ⚠️ **재생 UI 는 패키지에 넣지 않는다 — 호스트가 주입한다.** prod 플레이어
 * (`trinity/apps/jungol/src/components/ui/tiptap/midibus/MidibusInner.svelte`)는
 * ① 로그인 계정 id 로 `uuid` 를 조립하고 ② `GET /midibus/start/{id}` 로 이어보기 지점을
 * 받아오며 ③ PIP 헬퍼를 쓴다 — 셋 다 **호스트 앱의 API 클라이언트·세션**이 있어야 하는
 * 것이라 패키지 안으로 들어올 수 없다. 그래서 파일 첨부가 `resolver` 를 받는 것과 같은
 * 방식으로 `renderer` 를 받는다: **노드와 마크업은 여기, 플레이어는 앱.**
 * 주입이 없으면(코드패스 등) 지금까지처럼 자리표시자로 폴백한다.
 *
 * ⚠️ 정올은 전 문서에 `COEP: require-corp` 를 걸어 두어서, `credentialless` 를 모르는
 * 파이어폭스·사파리에서는 **prod 에서도 이 영상이 이미 빈 회색 박스**다. 주입된
 * 플레이어도 그 미해결 문제를 그대로 물려받는다 — 나빠지지는 않지만 낫지도 않다.
 * 자리표시자에는 플레이어 새 탭 링크를 둔다 — 비로그인 prod 가 쓰는 것과 같은 주소다.
 */
import { Node, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
/** 호스트 플레이어가 받는 것. 속성은 `node.attrs`(`id`·`start`·`uuid`·`width`·`height`). */
export interface MidibusRenderContext {
    /** 플레이어를 그려 넣을 빈 칸. 노드뷰가 만들어 준다. */
    element: HTMLElement;
    node: ProseMirrorNode;
    editor: Editor;
}
/**
 * 치울 함수를 돌려주거나(노드가 사라질 때 불린다), `false` 로 **사양**한다.
 * 사양하면 노드뷰가 자리표시자로 되돌아가므로, 호스트는 조건부로만 그릴 수 있다.
 */
export type MidibusRenderResult = (() => void) | void | false;
export type MidibusRenderer = (context: MidibusRenderContext) => MidibusRenderResult;
export interface TiptapMidibusOptions {
    HTMLAttributes: Record<string, unknown>;
    /** 자리표시자의 "새 탭에서 보기" 가 향할 플레이어 주소 앞부분. */
    playerBaseUrl: string;
    /**
     * 호스트가 심어 주는 진짜 플레이어. 없거나 `false` 를 돌려주면 자리표시자.
     *
     * ⚠️ **주입은 화면만 바꾼다.** `renderHTML`(=`getHTML()`)은 이 옵션을 보지 않으므로
     * 왕복 바이트 보존은 렌더러가 있든 없든 같다. 테스트로 박아 뒀다.
     */
    renderer: MidibusRenderer | null;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        tiptapMidibus: {
            setTiptapMidibus: (attrs: {
                id: string;
                start?: number | string;
                uuid?: string;
                width?: string;
                height?: string;
            }) => ReturnType;
        };
    }
}
/** 여는 태그에 실제로 적혀 있던 속성을 **적힌 순서 그대로** 담는다. */
export type MidibusRawAttrs = Record<string, string>;
export declare const TiptapMidibus: Node<TiptapMidibusOptions, any>;
//# sourceMappingURL=TiptapMidibus.d.ts.map