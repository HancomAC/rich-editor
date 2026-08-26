<script lang="ts">
  /**
   * LaTeX 수식 편집 모달.
   *
   * `InputModal` 을 재사용하지 않고 따로 둔 이유는 둘이다:
   *   1. 수식은 한 줄로 안 끝난다(행렬·정렬 환경) → `textarea`
   *   2. LaTeX 는 눈으로 확인하지 않으면 맞게 썼는지 알 수 없다 → **실시간 미리보기**
   *
   * 렌더는 편집기 NodeView 와 같은 KaTeX 옵션(`throwOnError:false`)을 쓴다. 그래서
   * 여기서 보이는 모양이 곧 본문에 들어갈 모양이다.
   */
  import { X } from "lucide-svelte";
  import katex from "katex";

  let {
    latex = "",
    displayMode = false,
    onConfirm,
    onCancel,
  }: {
    latex?: string;
    displayMode?: boolean;
    /** 빈 문자열로 확인하면 호출부가 노드를 지운다(편집 중일 때). */
    onConfirm: (value: string) => void;
    onCancel: () => void;
  } = $props();

  let value = $state(latex);
  let inputEl: HTMLTextAreaElement | undefined = $state();

  const preview = $derived.by(() => {
    const source = value.trim();
    if (!source) return { html: "", error: "" };
    try {
      return {
        html: katex.renderToString(source, {
          displayMode,
          throwOnError: true,
          strict: false,
          output: "html",
        }),
        error: "",
      };
    } catch (err) {
      return { html: "", error: err instanceof Error ? err.message : String(err) };
    }
  });

  $effect(() => {
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });

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
    onConfirm(value.trim());
  }

  function handleKeydown(e: KeyboardEvent) {
    // 줄바꿈이 필요한 문법(행렬 등)이 있으므로 Enter 는 그대로 두고,
    // 확인은 Ctrl/⌘+Enter 로 받는다.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!--
  ⚠️ z-index 를 Tailwind `z-50` 으로 두면 **호스트 앱 밑에 깔린다.** 정올은 헤더가 98,
  레이아웃 오버레이가 1000, 다이얼로그 스크림이 99999999 다(`apps/jungol/src/routes/layout.css`).
  이 모달은 본문 클릭으로도 열리므로 다이얼로그 안의 에디터에서 열릴 수 있다 — 스크림보다 위여야 한다.
  Tailwind 임의값 클래스 대신 인라인 style 로 준다(`.claude/rules/rich-editor.md`: 동적 클래스 금지).
-->
<div
  class="fixed inset-0 flex items-center justify-center bg-black/40"
  style="z-index: 100000001"
  onclick={onCancel}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="bg-background border border-border rounded-xl shadow-xl p-5 w-[440px] max-w-[90vw]"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-semibold">
        {displayMode ? "수식 블록" : "인라인 수식"}
      </span>
      <button
        type="button"
        class="p-1 rounded-md hover:bg-muted text-muted-foreground"
        onclick={onCancel}
        aria-label="닫기"
      >
        <X size={14} />
      </button>
    </div>

    <textarea
      bind:this={inputEl}
      rows="3"
      spellcheck="false"
      class="w-full border border-border rounded-md px-3 py-2 text-sm font-mono bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      placeholder={"\\frac{a}{b} \\le c"}
      bind:value
      onkeydown={handleKeydown}
    ></textarea>

    <!--
      ⚠️ 바탕을 `bg-muted/40` 으로 주지 않는다. 호스트가 `--muted` 를 **hex** 로 주는데
      Tailwind 3 의 투명도 변형은 채널 표기를 요구해 그 클래스를 **조용히 만들지 않는다**
      (빌드된 CSS 에 규칙이 아예 없다 — 실제로 확인했다). `.claude/rules/rich-editor.md` 대로
      `color-mix` 를 인라인으로 준다. `editor.css` 의 `.hce-active` 가 같은 이유로 같은 처방을 쓴다.
    -->
    <div
      class="mt-3 min-h-[52px] flex items-center justify-center rounded-md border border-border px-3 py-2 overflow-x-auto"
      style="background-color: color-mix(in srgb, var(--muted) 40%, transparent)"
    >
      {#if preview.error}
        <span class="text-xs text-destructive break-all">{preview.error}</span>
      {:else if preview.html}
        <!-- katex.renderToString 산출물. 사용자 입력은 KaTeX 가 이스케이프한다. -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html preview.html}
      {:else}
        <span class="text-xs text-muted-foreground">미리보기</span>
      {/if}
    </div>

    <div class="flex items-center justify-between gap-2 mt-4">
      <span class="text-[11px] text-muted-foreground">⌘/Ctrl + Enter 로 확인</span>
      <div class="flex gap-2">
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
</div>
