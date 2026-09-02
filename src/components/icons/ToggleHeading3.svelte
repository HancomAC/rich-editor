<script lang="ts">
  /* 단계를 박아 둔 껍데기 — 이유는 `ToggleHeading1.svelte` 참조. */
  import ToggleHeadingIcon from "./ToggleHeadingIcon.svelte";

  let { size = 24 }: { size?: number } = $props();
</script>

<ToggleHeadingIcon {size} level={3} />
