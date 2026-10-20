<script lang="ts">
  import TipTapEditor from "../src/components/TipTapEditor.svelte";
  import TablePreview from "./TablePreview.svelte";
  import { SvelteSet } from 'svelte/reactivity';
  import { TOOLBAR_PRESETS, type ToolbarFeature, type ToolbarMode } from "../src/types";
  import { configurePdfJs } from "../src/utils/pdf";
  import "../src/styles/editor.css";

  const tablePreview = new URLSearchParams(window.location.search).has('table-preview');

  configurePdfJs({
    pdfSrc: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs",
    workerSrc: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
  });

  let html = $state("");
  let showOutput = $state(false);

  async function handleUpload(file: File): Promise<string> {
    return URL.createObjectURL(file);
  }

  type TestMode = 'full' | 'standard' | 'minimal' | 'custom';
  let mode = $state<TestMode>('full');

  const ALL_FEATURES: ToolbarFeature[] = TOOLBAR_PRESETS.full;
  const enabledFeatures = new SvelteSet<ToolbarFeature>(ALL_FEATURES);

  function toggleFeature(f: ToolbarFeature) {
    if (enabledFeatures.has(f)) enabledFeatures.delete(f);
    else enabledFeatures.add(f);
  }

  function selectAll() { ALL_FEATURES.forEach((feature) => enabledFeatures.add(feature)); }
  function selectNone() { enabledFeatures.clear(); }

  const currentFeatures = $derived<ToolbarFeature[] | undefined>(
    mode === 'custom' ? [...enabledFeatures] : undefined
  );
  const currentToolbar = $derived<ToolbarMode>(
    mode === 'custom' ? 'full' : mode
  );

  const GROUPS: { label: string; items: ToolbarFeature[] }[] = [
    { label: '서식', items: ['bold', 'italic', 'underline', 'strike', 'highlight', 'superscript', 'subscript', 'code'] },
    { label: '정렬', items: ['align-left', 'align-center', 'align-right'] },
    { label: '제목', items: ['h1', 'h2', 'h3'] },
    { label: '블록', items: ['bullet-list', 'ordered-list', 'checklist', 'blockquote', 'horizontal-rule', 'toggle'] },
    { label: '미디어', items: ['link', 'image', 'pdf', 'file'] },
    { label: '레이아웃', items: ['columns-2', 'columns-3', 'table', 'code-block', 'math'] },
    { label: '히스토리', items: ['undo', 'redo'] },
    { label: 'UI', items: ['fixed-toolbar', 'bubble-toolbar', 'slash-menu', 'table-menu', 'character-count', 'upload-overlay'] },
  ];
</script>

{#if tablePreview}
  <TablePreview />
{:else}
<h1>rich-editor features 테스트</h1>

<nav class="tabs">
  {#each ['full', 'standard', 'minimal', 'custom'] as m (m)}
    <button class={{ active: mode === m }} onclick={() => (mode = m as TestMode)}>{m}</button>
  {/each}
</nav>

{#if mode === 'custom'}
  <div class="panel">
    <div class="panel-header">
      <button class="action-btn" onclick={selectAll}>전체 선택</button>
      <button class="action-btn" onclick={selectNone}>전체 해제</button>
      <span class="badge">{enabledFeatures.size}/{ALL_FEATURES.length}</span>
    </div>
    <div class="groups">
      {#each GROUPS as group (group.label)}
        <div class="group">
          <span class="group-label">{group.label}</span>
          {#each group.items as f (f)}
            <button
              class={['chip', { on: enabledFeatures.has(f) }]}
              onclick={() => toggleFeature(f)}
            >{f}</button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}

{#key `${mode}-${[...enabledFeatures].join(',')}`}
  <div class="editor-wrap">
    <TipTapEditor
      content=""
      onChange={(h) => (html = h)}
      onUploadFile={handleUpload}
      toolbar={currentToolbar}
      features={currentFeatures}
    />
  </div>
{/key}

<details class="output" bind:open={showOutput}>
  <summary>HTML 출력</summary>
  <pre>{html}</pre>
</details>
{/if}

<style>
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    background: var(--muted);
    padding: 3px;
    border-radius: 8px;
    width: fit-content;
  }
  .tabs button {
    padding: 6px 16px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted-foreground);
    transition: all 0.15s;
  }
  .tabs button.active {
    background: var(--background);
    color: var(--foreground);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .tabs button:hover:not(.active) {
    color: var(--foreground);
  }

  .panel {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 12px;
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .action-btn {
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--muted);
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted-foreground);
  }
  .action-btn:hover { color: var(--foreground); }
  .badge {
    font-size: 11px;
    color: var(--muted-foreground);
    margin-left: 4px;
  }

  .groups {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
  .group-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-right: 2px;
    white-space: nowrap;
  }

  .chip {
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    background: var(--background);
    color: var(--muted-foreground);
    transition: all 0.12s;
    line-height: 1.5;
    white-space: nowrap;
  }
  .chip.on {
    background: color-mix(in srgb, var(--primary) 12%, transparent);
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
    color: var(--primary);
  }
  .chip:hover {
    border-color: var(--primary);
  }

  .editor-wrap {
    margin-bottom: 12px;
  }
</style>
