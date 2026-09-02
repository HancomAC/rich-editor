<script lang="ts">
  /*
   * 단계별 얇은 껍데기. 슬래시 메뉴는 아이콘을 `Component<{ size?: number }>` 로 **데이터
   * 표에 담아** 두고 `<item.icon size={SI} />` 로만 그린다 — 거기엔 `level` 을 넘길 자리가
   * 없다. 그래서 단계를 미리 박아 둔 컴포넌트를 셋 만든다.
   */
  import ToggleHeadingIcon from "./ToggleHeadingIcon.svelte";

  let { size = 24 }: { size?: number } = $props();
</script>

<ToggleHeadingIcon {size} level={1} />
