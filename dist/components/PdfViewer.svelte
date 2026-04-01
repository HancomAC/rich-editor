<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import { getPdfJs } from "../utils/pdf";

  let { src, fileName }: { src: string; fileName?: string } = $props();

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let containerEl: HTMLDivElement | undefined = $state();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf: any = $state(null);
  let page = $state(1);
  let total = $state(0);
  let loading = $state(true);
  let error = $state(false);
  let rendering = false;

  async function renderPage() {
    if (!pdf || !canvasEl || !containerEl || rendering) return;
    rendering = true;
    try {
      const pageObj = await pdf.getPage(page);
      const unscaledViewport = pageObj.getViewport({ scale: 1 });
      const availableWidth = containerEl.clientWidth - 32;
      if (availableWidth <= 0) return;
      const scale = availableWidth / unscaledViewport.width;
      const viewport = pageObj.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = viewport.width * dpr;
      canvasEl.height = viewport.height * dpr;
      canvasEl.style.width = `${viewport.width}px`;
      canvasEl.style.height = `${viewport.height}px`;
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;
      ctx.resetTransform();
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.scale(dpr, dpr);
      await pageObj.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      rendering = false;
    }
  }

  $effect(() => {
    if (pdf && page) renderPage();
  });

  onMount(() => {
    let cancelled = false;

    (async () => {
      try {
        loading = true;
        error = false;
        const pdfjsLib = await getPdfJs();
        const loadingTask = pdfjsLib.getDocument(src);
        const pdfDoc = await loadingTask.promise;
        if (!cancelled) {
          pdf = pdfDoc;
          total = pdfDoc.numPages;
          loading = false;
        }
      } catch (e) {
        console.error("[PdfViewer] PDF 로드 실패:", src, e);
        if (!cancelled) {
          error = true;
          loading = false;
        }
      }
    })();

    // ResizeObserver
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(renderPage, 100);
    });
    if (containerEl) observer.observe(containerEl);

    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timeout);
    };
  });
</script>

{#if error}
  <div class="border border-border rounded-lg p-4 text-center">
    <p class="text-sm text-muted-foreground">PDF를 불러올 수 없습니다.</p>
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      class="text-sm text-primary hover:underline"
    >
      직접 다운로드
    </a>
  </div>
{:else if loading}
  <div class="border border-border rounded-lg p-8 text-center">
    <p class="text-sm text-muted-foreground animate-pulse">PDF 로딩 중...</p>
  </div>
{:else}
  <div class="border border-border rounded-lg overflow-hidden bg-muted/30 my-4">
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-border bg-background"
    >
      <span class="text-xs text-muted-foreground truncate">
        {fileName || "PDF 문서"}
      </span>
      <span class="text-xs text-muted-foreground tabular-nums">
        {page} / {total}
      </span>
    </div>

    <div
      bind:this={containerEl}
      class="flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900"
    >
      <canvas bind:this={canvasEl} class="shadow-sm"></canvas>
    </div>

    {#if total > 1}
      <div
        class="flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-background"
      >
        <button
          type="button"
          onclick={() => (page = Math.max(1, page - 1))}
          disabled={page <= 1}
          class="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30"
          title="이전 페이지"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-sm tabular-nums">
          {page} / {total}
        </span>
        <button
          type="button"
          onclick={() => (page = Math.min(total, page + 1))}
          disabled={page >= total}
          class="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30"
          title="다음 페이지"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    {/if}
  </div>
{/if}
