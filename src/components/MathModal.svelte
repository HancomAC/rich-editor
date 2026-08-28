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

  /*
   * ── 자주 쓰는 기호 ─────────────────────────────────────────────────────────
   * LaTeX 를 외우고 있는 사람만 수식을 쓸 수 있으면 기능이 반만 있는 것이다(사용자 제안).
   *
   * 고른 기준은 **온라인저지 본문에 실제로 나오는 것** — 복잡도 표기(빅오·log·합),
   * 제약 조건(부등호·지수), 수열 첨자, 그리고 그리스 문자 몇이다. 미분·적분처럼
   * 여기서 드문 것은 넣지 않았다. 늘리면 팔레트가 본문보다 커진다.
   *
   * `$` 는 커서를 놓을 자리다(아래 `insert` 가 그 자리에 커서를 둔다). 없으면 끝에 놓인다.
   */
  const SYMBOLS: { label: string; snippet: string; title: string }[] = [
    { label: "x²", snippet: "^{$}", title: "위첨자" },
    { label: "xᵢ", snippet: "_{$}", title: "아래첨자" },
    { label: "a/b", snippet: "\\frac{$}{}", title: "분수" },
    { label: "√", snippet: "\\sqrt{$}", title: "제곱근" },
    { label: "∑", snippet: "\\sum_{i=1}^{n} $", title: "합" },
    { label: "∏", snippet: "\\prod_{i=1}^{n} $", title: "곱" },
    { label: "log", snippet: "\\log $", title: "로그" },
    { label: "O(n)", snippet: "O($)", title: "빅오 표기" },
    { label: "≤", snippet: "\\le $", title: "작거나 같다" },
    { label: "≥", snippet: "\\ge $", title: "크거나 같다" },
    { label: "≠", snippet: "\\ne $", title: "같지 않다" },
    { label: "×", snippet: "\\times $", title: "곱하기" },
    { label: "÷", snippet: "\\div $", title: "나누기" },
    { label: "∈", snippet: "\\in $", title: "원소" },
    { label: "∞", snippet: "\\infty $", title: "무한대" },
    { label: "α", snippet: "\\alpha $", title: "알파" },
    { label: "θ", snippet: "\\theta $", title: "세타" },
    { label: "π", snippet: "\\pi $", title: "파이" },
    { label: "→", snippet: "\\to $", title: "화살표" },
    { label: "⋯", snippet: "\\cdots $", title: "가운데 말줄임" },
  ];

  /**
   * 커서 자리에 조각을 끼워 넣는다.
   *
   * ⚠️ `value` 를 그냥 이어 붙이면 **커서가 맨 뒤로 튄다** — 수식 가운데를 고치던 중에
   * 기호를 누르면 엉뚱한 곳에 들어간다. 선택 구간을 직접 다루고, 넣은 뒤 커서를
   * `$` 자리(없으면 조각 끝)에 되돌려 놓는다.
   */
  function insert(snippet: string) {
    const el = inputEl;
    if (!el) return;

    const caret = snippet.indexOf("$");
    const text = snippet.replace("$", "");
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;

    value = value.slice(0, start) + text + value.slice(end);

    const next = start + (caret === -1 ? text.length : caret);
    /* 값 반영이 DOM 에 적용된 뒤에 커서를 옮겨야 한다. */
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next, next);
    });
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
    class="hce-math-panel bg-background border border-border rounded-xl shadow-xl p-5 w-[440px] max-w-[90vw]"
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
      기호 팔레트. `textarea` **바로 아래**에 둔다 — 누르면 글자가 들어가는 곳이라
      입력창과 붙어 있어야 어디로 들어갈지 짐작이 간다.
    -->
    <div class="hce-math-symbols mt-2 flex flex-wrap gap-1">
      {#each SYMBOLS as sym}
        <button
          type="button"
          class="hce-math-sym"
          title={sym.title}
          aria-label={sym.title}
          onclick={() => insert(sym.snippet)}
        >
          {sym.label}
        </button>
      {/each}
    </div>

    <!--
      ⚠️ 바탕을 `bg-muted/40` 으로 주지 않는다. 호스트가 `--muted` 를 **hex** 로 주는데
      Tailwind 3 의 투명도 변형은 채널 표기를 요구해 그 클래스를 **조용히 만들지 않는다**
      (빌드된 CSS 에 규칙이 아예 없다 — 실제로 확인했다). `.claude/rules/rich-editor.md` 대로
      `color-mix` 를 인라인으로 준다. `editor.css` 의 `.hce-active` 가 같은 이유로 같은 처방을 쓴다.
    -->
    <div
      class="hce-math-preview mt-3 min-h-[52px] flex items-center justify-center rounded-md border border-border px-3 py-2 overflow-x-auto"
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

    <div class="hce-math-actions flex items-center justify-between gap-2 mt-4">
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
          class="px-3.5 py-1.5 text-sm rounded-md hce-btn-primary hover:opacity-90 transition-opacity"
          onclick={handleSubmit}
        >
          확인
        </button>
      </div>
    </div>
  </div>
</div>

<style>
	/*
	 * ⚠️ **`box-sizing` 을 호스트에 기대면 안 된다.**
	 *
	 * 이 패키지는 Tailwind preflight 를 끄고 배포하고(`tailwind.config.js` 의
	 * `corePlugins.preflight: false`), 정올 앱에도 전역 `* { box-sizing: border-box }` 리셋이
	 * 없다(`layout.css` 의 `*` 규칙은 reduced-motion 과 탭 하이라이트뿐). 그래서 `w-full`
	 * (= `width: 100%`) 에 좌우 패딩 24px + 테두리 2px 가 **그대로 더해져** 입력창이 모달
	 * 오른쪽으로 삐져나왔다(사용자 제보).
	 *
	 * 패키지가 내보내는 상자는 자기 안에서 못을 박는다 — 툴바 버튼·표 셀·카드 프레임이
	 * 이미 같은 이유로 각자 `box-sizing` 을 들고 있다.
	 */
	.hce-math-panel,
	.hce-math-panel textarea,
	.hce-math-preview,
	.hce-math-actions {
		box-sizing: border-box;
	}

	.hce-math-panel textarea {
		max-width: 100%;
	}

	/*
	 * 기호 버튼. 스무 개가 두 줄로 앉으므로 **작고 조용해야** 한다 — 입력창보다 눈에 띄면
	 * 무엇이 본체인지 흐려진다.
	 *
	 * ⚠️ 색·면을 직접 준다. 이 모달은 `.hce-editor-wrapper` 안에 렌더되어 패키지 리셋
	 * (`background: transparent`, 0,1,1)을 맞는데, Tailwind 유틸리티(0,1,0)로는 못 이긴다
	 * — 확인 버튼이 통째로 안 보이던 것과 같은 뿌리다(`editor.css` 의 `.hce-btn-primary` 주석).
	 * 여기는 Svelte 스코프가 붙어 특이도가 더 높으므로 그대로 먹는다.
	 */
	.hce-math-sym {
		box-sizing: border-box;
		min-width: 30px;
		padding: 3px 7px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--background);
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.4;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		cursor: pointer;
		transition:
			background-color 0.12s,
			color 0.12s,
			border-color 0.12s;
	}

	.hce-math-sym:hover {
		background: var(--muted);
		color: var(--foreground);
		border-color: var(--ring, var(--muted-foreground));
	}
</style>
