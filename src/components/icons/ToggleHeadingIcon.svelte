<script lang="ts">
  /*
   * 토글 제목 아이콘 — 펼침 삼각형 + 제목 단계(H1·H2·H3).
   *
   * 메뉴에서 `토글 제목 N` 이 `제목 N` 과 **똑같은 lucide `HeadingN` 아이콘**을 쓰고 있어서,
   * 목록만 보고는 둘을 구분할 수 없었다(사용자 지적). 접힌다는 사실을 아이콘이 말해야 한다.
   *
   * 삼각형은 실제 토글 손잡이(`editor.css` 의 `[data-type="details"] > button::after`,
   * 밑변 7px · 높이 11px 채운 삼각형)와 **같은 모양·같은 비율(0.63)** 로 맞춘다 — 메뉴에서 고른
   * 것과 문서에 생긴 것이 같아 보여야 한다. 거기 적힌 교훈도 그대로 적용된다: **작으면 점처럼
   * 보인다.**
   *
   * ⚠️ **상자를 정사각(24×24)으로 유지한다.** 슬래시 메뉴는 아이콘을 20×20 칩(`.slash-icon`)
   * 안에 가운데 정렬로 넣고, 고정 툴바 메뉴는 `flex gap-2` 로 라벨을 잇는다. 삼각형을 글자
   * 왼쪽 **바깥**에 덧대 폭을 넓히면 그 줄만 칩을 넘치거나 라벨이 밀린다.
   *
   * 그래서 삼각형은 lucide 가 비워 두는 왼쪽 여백(x 0~4)에 넣고, 제목 글자는 **줄이지 않고**
   * 오른쪽으로 2 만 민다. 14px 로 그려지는 메뉴에서 글자를 줄이면 그만큼 읽기 어려워지고,
   * 바로 위에 붙는 `제목 N` 과 크기가 달라 한 가족으로 안 보인다(0.7~0.9 로 줄인 안을 픽셀로
   * 비교해 고른 값이다). 배율이 1 이라 **획 두께 보정도 필요 없다** — `scale()` 로 줄이면
   * 획까지 같이 줄어 옆 아이콘보다 가늘어진다.
   */
  interface Props {
    /** 바깥 상자 한 변(px). lucide 아이콘과 같은 뜻이다. */
    size?: number;
    level?: 1 | 2 | 3;
  }

  let { size = 24, level = 1 }: Props = $props();

  /**
   * lucide `heading-1|2|3` 의 **숫자 부분만**. `H` 획 세 개는 세 단계가 공유하므로 아래
   * 마크업에 한 벌만 둔다. (lucide-svelte v0.477.0 의 `iconNode` 와 같은 값)
   */
  const DIGIT: Record<1 | 2 | 3, string[]> = {
    1: ["m17 12 3-2v8"],
    2: ["M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"],
    3: [
      "M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2",
      "M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2",
    ],
  };
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- 펼침 표식. 이 아이콘에서 유일하게 칠하는 요소라 fill·stroke 를 여기서 뒤집는다. -->
  <path d="M1 9 4.7 12 1 15Z" fill="currentColor" stroke="none" />
  <!-- lucide `heading-N` 을 통째로 오른쪽으로 2. `H` 획은 세 단계가 같다. -->
  <g transform="translate(2 0)">
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    {#each DIGIT[level] as d}
      <path {d} />
    {/each}
  </g>
</svg>
