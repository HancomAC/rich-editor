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
    class="bg-background border border-border rounded-xl shadow-xl p-5 w-[360px] max-w-[90vw]"
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
        class="px-3.5 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        onclick={handleSubmit}
      >
        확인
      </button>
    </div>
  </div>
</div>
