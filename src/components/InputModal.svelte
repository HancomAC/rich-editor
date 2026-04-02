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
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
  onclick={handleBackdropClick}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="bg-background border border-border rounded-lg shadow-lg p-4 w-80"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium">{title}</span>
      <button
        type="button"
        class="p-0.5 rounded hover:bg-muted text-muted-foreground"
        onclick={onCancel}
      >
        <X size={14} />
      </button>
    </div>
    <input
      bind:this={inputEl}
      type="text"
      class="w-full border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      {placeholder}
      bind:value
      onkeydown={handleKeydown}
    />
    <div class="flex justify-end gap-2 mt-3">
      <button
        type="button"
        class="px-3 py-1 text-sm rounded border border-border hover:bg-muted"
        onclick={onCancel}
      >
        취소
      </button>
      <button
        type="button"
        class="px-3 py-1 text-sm rounded bg-primary text-primary-foreground hover:opacity-90"
        onclick={handleSubmit}
      >
        확인
      </button>
    </div>
  </div>
</div>
