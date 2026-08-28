<script lang="ts">
  import { X } from "lucide-svelte";

  let {
    title,
    placeholder = "",
    defaultValue = "",
    onConfirm,
    onCancel,
  }: {
    title: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
  } = $props();

  let value = $state(defaultValue);
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });

  // Window-level Escape key handler
  $effect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  }

  function handleBackdropClick() {
    onCancel();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  onclick={handleBackdropClick}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="hce-input-panel bg-background border border-border rounded-xl shadow-xl p-5 w-[360px] max-w-[90vw]"
    onclick={(e) => e.stopPropagation()}
  >
    {#if title}
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold">{title}</span>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-muted text-muted-foreground"
          onclick={onCancel}
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </div>
    {/if}
    <input
      bind:this={inputEl}
      type="text"
      class="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      {placeholder}
      bind:value
      onkeydown={handleKeydown}
    />
    <div class="flex justify-end gap-2 mt-4">
      <button
        type="button"
        class="px-3.5 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors"
        onclick={onCancel}
      >
        취소
      </button>
      <button
        type="button"
        class="px-3.5 py-1.5 text-sm rounded-md hce-btn-primary hover:opacity-90 transition-opacity"
        onclick={handleSubmit}
      >
        확인
      </button>
    </div>
  </div>
</div>

<style>
	/*
	 * `w-full` 은 `width: 100%` 일 뿐이라, `box-sizing` 이 `content-box` 로 남아 있으면
	 * 좌우 패딩·테두리가 그대로 더해져 입력창이 모달 밖으로 나간다. 이 패키지는 Tailwind
	 * preflight 를 끄고 배포하고 정올 앱에도 전역 리셋이 없다 — 수식 모달에서 실제로 터졌다.
	 * 같은 조합이므로 여기서도 미리 못을 박는다.
	 */
	.hce-input-panel,
	.hce-input-panel input {
		box-sizing: border-box;
	}
</style>
