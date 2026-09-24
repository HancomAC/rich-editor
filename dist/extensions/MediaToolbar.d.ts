/**
 * 미디어 리사이즈 툴바 — 미디어 블록을 **선택하면** 그 아래에 뜨는 프리셋 칩 줄.
 * (main 정올 `plugin/resize/index.ts` 1343줄 참조 — 의미 있는 로직만 재작성.)
 *
 * main 에서 가져온 것: 비율 프리셋(16:9·4:3·1:1), 좌/중/우 정렬, 폭 프리셋(100%·50%),
 * "비율을 고르면 고정 높이를 풀고, 높이를 드래그하면 비율을 푼다" 는 배타 규칙.
 * main 에서 **뺀 것**: hover 앵커 + 열고 닫는 상태 기계(여기서는 선택 = 표시라 상태가
 * 필요 없다), 손잡이 겸 토글 버튼(높이 드래그는 각 노드뷰의 `attachResize` 가 맡는다),
 * 드래그 프록시, `data-resize-handler` 로 아무 노드나 끼워 주는 범용 attr 경로,
 * 이미지 전용 rAF 위치 보정. 전부 "코드 크기 대비 얻는 것" 이 없어서다.
 *
 * UI 는 ProseMirror **widget decoration** 으로 세운다 — NodeView 안에 넣으면 노드마다
 * 툴바 DOM 이 상주하지만, 데코레이션은 선택된 하나에만 붙었다 떨어진다.
 *
 * ⚠️ **편집 모드 전용.** `decorations`/`mousedown` 양쪽에서 `editor.isEditable` 을 보고,
 * `TipTapEditor` 도 편집일 때만 이 확장을 싣는다(이중 안전).
 *
 * ⚠️ 크기·정렬은 전부 **노드 속성**으로 저장된다(각 노드의 `renderHTML`/`parseHTML` 이
 * 왕복을 책임진다). 여기서는 `setNodeMarkup` 으로 속성만 바꾼다 — DOM 을 직접 만지면
 * 저장본과 화면이 갈라진다.
 */
import { Extension } from "@tiptap/core";
export interface MediaToolbarTypeConfig {
    /** 비율 프리셋 칩(16:9 등)을 보여줄지. 비율 박스를 그리는 노드뷰에만 켠다. */
    ratio?: boolean;
    /** 좌/중/우 정렬 칩. */
    align?: boolean;
    /** 폭 프리셋 칩(100%·50%). `width` 속성이 CSS 크기 문자열인 노드에만 켠다. */
    widthPresets?: boolean;
}
export interface MediaResizeToolbarOptions {
    /** 노드 타입 이름 → 보여줄 칩 구성. */
    types: Record<string, MediaToolbarTypeConfig>;
}
/**
 * 칩 하나가 만드는 속성 변경. **순수 함수** — 테스트가 이걸 직접 두드린다.
 * 이미 켜진 칩을 다시 누르면 해제(`null`)다. main 의 `Auto` 칩을 재클릭-해제로 접었다.
 */
export declare function applyMediaToolbarAction(attrs: Record<string, unknown>, action: string, value: string, config: MediaToolbarTypeConfig): Record<string, unknown> | null;
export declare const MediaResizeToolbar: Extension<MediaResizeToolbarOptions, any>;
//# sourceMappingURL=MediaToolbar.d.ts.map