/**
 * 「이 문서에서 **COEP 를 안 보내는 남의 iframe** 을 실을 수 있는가」.
 *
 * ⚠️ 정올은 전 문서에 `Cross-Origin-Embedder-Policy: require-corp`(교차 출처 격리)를
 * 건다. 격리된 문서에 자기 COEP 를 안 보내는 제3자 iframe(유튜브·Vimeo·mbus 전부
 * 해당)을 넣는 방법은 **`credentialless` 속성뿐**인데 크로미움 전용이다
 * (파이어폭스 미구현·사파리 거부).
 *
 * 격리되지 않은 문서(코드패스의 비-크로미움 등)에서는 평범한 크로스오리진 iframe 이라
 * 아무 문제가 없다 — 그래서 격리 여부와 지원 여부를 **함께** 본다.
 *
 * ⚠️ 이 판정과 `applyCrossOriginEmbedAttrs` 는 **항상 짝으로** 쓴다. 한쪽만 쓰면
 * 격리된 문서에서 브라우저가 iframe 을 막고 크롬이 제 오류 화면
 * (`…에서 연결을 거부했습니다`)을 그 자리에 그린다 — `MbusVideo` 가 실제로 그랬다.
 */
export declare function canEmbedCrossOrigin(): boolean;
/**
 * 격리된 문서에서 COEP 없는 영상을 싣는 유일한 통로. 크로미움이 아니면 이 속성 자체가
 * 무시되므로 조건 없이 붙여도 해가 없다.
 */
export declare function applyCrossOriginEmbedAttrs(iframe: HTMLIFrameElement): void;
//# sourceMappingURL=embed.d.ts.map