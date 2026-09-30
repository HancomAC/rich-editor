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
 * 제3자 임베드 iframe 이 **실제로 로드되게** 하는 속성 묶음. 둘은 막는 층이 다르므로
 * 항상 같이 붙인다.
 *
 * 1. `credentialless` — 격리된 문서(COEP `require-corp`)에서 COEP 없는 남의 iframe 을
 *    싣는 유일한 통로. 크로미움이 아니면 무시되므로 조건 없이 붙여도 해가 없다.
 *
 * 2. `referrerpolicy` — ⚠️ **호스트가 Referer 를 끄고 있을 수 있다.** 정올은
 *    `app.html` 에 `<meta name="referrer" content="same-origin">` 을 두어 교차 출처로는
 *    Referer 를 **아예 안 보낸다.** 그런데 mbus 채널 중에는 Referer 로 출처를 거르는
 *    것이 있어서, 그런 영상은 CDN 청크가 403 으로 막히고 플레이어가
 *    `인코딩에 실패했거나 접근 제한되어 재생할 수 없습니다` 를 띄운다 — 영상 자체는
 *    멀쩡한데(최상위 playlist 는 200) 안 나오는, 설명이 안 되는 실패로 보인다.
 *    실측(`ch_17827535`): Referer 없음 → 403 · `https://jungol.co.kr/` → 200 ·
 *    엉뚱한 출처 → 403. 요소에 건 정책이 문서 메타를 이기므로 여기서 되돌린다.
 *    ⚠️ 전체 URL 이 아니라 **출처만** 보낸다(`strict-origin-…`) — 어느 글에서 봤는지까지
 *    남의 서버에 알릴 이유는 없다. 앱의 다른 mbus 자리(`MidibusInner`·`legacy-iframe`)가
 *    쓰는 값과 같다.
 */
export declare function applyCrossOriginEmbedAttrs(iframe: HTMLIFrameElement): void;
//# sourceMappingURL=embed.d.ts.map