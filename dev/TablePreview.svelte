<script lang="ts">
  import TipTapEditor from '../src/components/TipTapEditor.svelte';
  import { TOOLBAR_PRESETS, type ToolbarFeature } from '../src/types';
  import { renderStaticHtml, sanitizeHtml, transformLegacyHtml } from '../src/static';
  import { attachTableScrollControls } from '../src/table-scroll';

  const params = new URLSearchParams(window.location.search);
  let narrow = $state(params.get('width') === '360');
  let nested = $state(params.get('scroll') === 'nested');
  let fixedHeader = $state(params.get('header') !== '0');
  let toolbar = $state<'full' | 'minimal'>(
    params.get('toolbar') === 'minimal' ? 'minimal' : 'full'
  );
  let revision = $state(0);
  let output = $state('');
  let viewMode = $state<'edit' | 'readonly' | 'static'>(
    params.get('view') === 'static' ? 'static' : params.get('view') === 'readonly' ? 'readonly' : 'edit'
  );
  let staticRoot = $state<HTMLElement>();
  const features = $derived<ToolbarFeature[] | undefined>(
    toolbar === 'minimal' ? [...TOOLBAR_PRESETS.minimal, 'table-menu'] : undefined
  );

  const tableOnly = params.get('document') === 'table-only';
  const tableContent = (tableOnly ? '' : '<p>표를 아래로 스크롤하며 도구와 가로 이동을 확인하세요.</p>') +
    '<table style="width:1800px"><tbody>' + Array.from({ length: 36 }, (_, row) => {
      const tag = row === 0 ? 'th' : 'td';
      return '<tr>' + Array.from({ length: 12 }, (_, column) =>
        `<${tag} colwidth="150"><p>${row === 0 ? '항목' : `${row}행`} · ${column + 1}열</p></${tag}>`
      ).join('') + '</tr>';
    }).join('') + '</tbody></table>' + (tableOnly ? '' : '<p>표 끝입니다. 마지막 행에서도 도구를 사용할 수 있습니다.</p>');

  const content = $derived(output || tableContent);
  const staticHtml = $derived(renderStaticHtml(sanitizeHtml(transformLegacyHtml(content)), { wrapTables: true }));

  $effect(() => {
    if (viewMode !== 'static' || !staticRoot || !staticHtml) return;
    return attachTableScrollControls(staticRoot);
  });

  function resetTable() {
    output = '';
    revision++;
  }
</script>

<main class={['table-preview', { 'with-header': fixedHeader }]}>
  {#if fixedHeader}
    <header class="preview-fixed-header">고정된 앱 상단 영역</header>
  {/if}

  <h1>표 편집 미리보기</h1>
  <p class="description">36행 · 12열 · 열 너비 150px. 편집 내용은 서버에 저장하지 않습니다.</p>

  <div class="preview-controls">
    <label><input type="checkbox" bind:checked={narrow} />편집창 360px</label>
    <label><input type="checkbox" bind:checked={nested} />내부 세로 스크롤</label>
    <label><input type="checkbox" bind:checked={fixedHeader} />고정 상단 영역</label>
    <label>
      서식 도구
      <select bind:value={toolbar}>
        <option value="full">full</option>
        <option value="minimal">minimal</option>
      </select>
    </label>
    <label>
      화면
      <select bind:value={viewMode}>
        <option value="edit">편집</option>
        <option value="readonly">보기</option>
        <option value="static">정올 정적 보기</option>
      </select>
    </label>
    <button type="button" onclick={resetTable}>표 원본 복원</button>
  </div>

  <div class={['preview-scroll', { nested }]}>
    {#if nested && fixedHeader}
      <div class="preview-inner-header">스크롤 영역의 고정 상단 영역</div>
    {/if}
    <div
      class={['preview-editor', { narrow }]}
      style:--header-height={fixedHeader ? (nested ? '40px' : '56px') : '0px'}
    >
      {#key `${toolbar}-${revision}-${viewMode}`}
        {#if viewMode === 'static'}
          <div class="tiptap ProseMirror static-preview" bind:this={staticRoot}>
            {@html staticHtml}
          </div>
        {:else}
          <TipTapEditor {content} {toolbar} {features} editable={viewMode === 'edit'} onChange={(html) => (output = html)} />
        {/if}
      {/key}
    </div>
    <p class="preview-tail">표 아래 본문</p>
  </div>

  <details class="output">
    <summary>현재 HTML 확인</summary>
    <pre>{output || tableContent}</pre>
  </details>
</main>

<style>
  .table-preview {
    min-width: 0;
  }

  .table-preview.with-header {
    padding-top: 56px;
  }

  .preview-fixed-header,
  .preview-inner-header {
    display: flex;
    align-items: center;
    padding-inline: 16px;
    background: var(--background);
    border-bottom: 1px solid var(--border);
    font-size: 13px;
    z-index: 90;
  }

  .preview-fixed-header {
    position: fixed;
    inset: 0 0 auto;
    height: 56px;
  }

  .preview-inner-header {
    position: sticky;
    top: 0;
    height: 40px;
  }

  .description {
    margin-bottom: 16px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted-foreground);
  }

  .preview-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
    margin-bottom: 20px;
    font-size: 13px;
  }

  .preview-controls label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .preview-controls select,
  .preview-controls button {
    min-height: 32px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
    font: inherit;
  }

  .preview-controls button {
    cursor: pointer;
  }

  .preview-controls :is(input, select, button):focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }

  .preview-scroll {
    min-width: 0;
  }

  .preview-scroll.nested {
    height: 65vh;
    min-height: 280px;
    overflow: auto;
    border: 1px solid var(--border);
  }

  .preview-editor {
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }

  .preview-editor.narrow {
    width: 360px;
  }

  .preview-tail {
    padding-block: 80px;
    font-size: 13px;
    color: var(--muted-foreground);
  }
</style>
