/**
 * 범용 영상 임베드 — 유튜브·Vimeo, 그리고 그대로 넣을 수 있는 임베드 주소.
 *
 * ⚠️ **`MbusVideo` 와 따로 둔다.** 틀(16:9 iframe)은 똑같지만, mbus 노드는 앱 쪽
 * `MidibusInner.svelte` 가 `play.mbus.tv` 전용 파라미터(`label`·`start`·`volume`)를 붙여
 * 처리한다. 유튜브 주소를 `data-mbus-src` 로 저장하면 그 경로로 흘러 들어가 엉뚱하게
 * 다뤄진다. 저장 형식이 곧 계약이라, 담기는 것이 달라지면 이름도 달라야 한다.
 */
import { Node } from "@tiptap/core";
export interface VideoEmbedOptions {
    HTMLAttributes: Record<string, unknown>;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        videoEmbed: {
            setVideoEmbed: (attrs: {
                src: string;
                width?: string;
            }) => ReturnType;
        };
    }
}
/**
 * 붙여넣은 주소를 **iframe 에 넣을 수 있는 주소**로 바꾼다.
 *
 * ⚠️ 이 변환이 이 확장의 핵심이다. 사람들이 붙여넣는 `youtube.com/watch?v=…` 를 그대로
 * iframe 에 넣으면 유튜브가 `X-Frame-Options` 로 **거부**한다(화면엔 빈 칸만 남는다).
 * `embed/<id>` 로 바꿔야 비로소 실린다. mbus 주소는 그 자체가 플레이어 페이지라 이런
 * 손질이 필요 없었고, 그래서 `MbusVideo` 에는 이런 코드가 아예 없다.
 *
 * 아는 서비스가 아니면 **손대지 않고 그대로 돌려준다** — 이미 임베드 주소를 들고 온
 * 경우(사내 플레이어 등)를 막지 않기 위해서다.
 */
export declare function toEmbedUrl(raw: string): string;
export declare const VideoEmbed: Node<VideoEmbedOptions, any>;
//# sourceMappingURL=VideoEmbed.d.ts.map