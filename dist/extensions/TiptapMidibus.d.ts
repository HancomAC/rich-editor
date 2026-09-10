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
 * ⚠️ **재생 UI 는 일부러 포팅하지 않았다.** prod 플레이어
 * (`trinity/apps/jungol/src/components/ui/tiptap/midibus/MidibusInner.svelte`)는
 * ① 로그인 계정 id 로 `uuid` 를 조립하고 ② `GET /midibus/start/{id}` 로 이어보기 지점을
 * 받아오며 ③ PIP 헬퍼를 쓴다 — 셋 다 **호스트 앱의 API 클라이언트·세션**이 있어야 하는
 * 것이라 패키지 안으로 들어올 수 없다. 게다가 정올은 전 문서에 `COEP: require-corp` 를
 * 걸어 두어서, `credentialless` 를 모르는 파이어폭스·사파리에서는 prod 에서도 이 영상이
 * 이미 **빈 회색 박스**다. 재생을 어설프게 옮기면 그 미해결 문제를 그대로 물려받는다.
 * 대신 자리표시자에 플레이어 새 탭 링크를 둔다 — 비로그인 prod 가 쓰는 것과 같은 주소다.
 */
import { Node } from "@tiptap/core";
export interface TiptapMidibusOptions {
    HTMLAttributes: Record<string, unknown>;
    /** 자리표시자의 "새 탭에서 보기" 가 향할 플레이어 주소 앞부분. */
    playerBaseUrl: string;
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