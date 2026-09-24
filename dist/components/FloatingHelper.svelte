<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { Sigma, Code2 } from "lucide-svelte";
  import type { ToolbarFeature } from "../types";
  import {
    floatingHelperVisible,
    helperInsertMath,
    helperInsertCodeBlock,
    FLOATING_HELPER_ON_CLASS,
  } from "../utils/floating-helper";
  import { defaultTranslator, type EditorTranslator } from "../i18n";

  /*
   * 빈 줄 플로팅 헬퍼의 **화면 절반** — 판정·커맨드는 `utils/floating-helper.ts`.
   *
   * 포커스된 최상위 빈 문단 옆에 "/로 명령어 입력" 안내와 수식·코드 즉시 삽입 버튼을
   * 띄운다(main 정올 `Floating.svelte` 의 직접 구현 이식). 에디터 컨테이너
   * (`.hce-editor-wrapper`, `position:relative`) 안에 `position:absolute` 로 그린다 —
   * 포털이 없고 문서 흐름의 자리도 차지하지 않는다.
   *
   * ⚠️ 위치 계산 셋이 main 사고 이력의 재발 방지다:
   * - `.hce-floating-helper` 는 CSS 에서 **처음부터** `position:absolute; width:max-content`
   *   다. 블록 폭으로 측정된 뒤에 좁히면 넘침 보정이 화면 밖(left:-437px)으로 민 전력이
   *   있다(main floating-ui 시절).
   * - 등장 애니메이션은 **안쪽 요소에만** 건다. 바깥(위치 담당)에 transform 을 걸면
   *   위치가 애니메이션 프레임에 덮인다(main `79f64c18`→`c9840fdb`).
   * - 슬래시·이모지 메뉴가 열리면 `suppressed` 로 끈다 — 그 둘은 `position:fixed`
   *   뷰포트 좌표라 좌표계가 달라 서로 피해 갈 수 없다.
   */
  let {
    editor,
    features,
    suppressed = false,
    t = defaultTranslator,
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    suppressed?: boolean;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
  } = $props();

  let visible = $state(false);
  let pos = $state({ top: 0, left: 0 });
  let helperEl = $state<HTMLDivElement>();
  let focused = $state(false);

  const showMath = $derived(features.has("math"));
  const showCode = $derived(features.has("code-block"));
  const hasButtons = $derived(showMath || showCode);

  function updatePosition() {
    const wrapper = editor.view.dom.closest(".hce-editor-wrapper") as HTMLElement | null;
    if (!wrapper) return;
    const { from } = editor.state.selection;
    const caret = editor.view.coordsAtPos(from);
    const box = wrapper.getBoundingClientRect();
    let left = caret.right - box.left + 8;
    let top = caret.top - box.top;
    /*
     * 요소가 이미 서 있으면 실측으로 보정한다 — 세로는 커서 줄에 가운데 맞춤,
     * 가로는 래퍼 오른쪽을 넘으면 안으로 죈다(첫 프레임은 아래 `$effect` 가 재계산).
     */
    if (helperEl) {
      const h = helperEl.offsetHeight;
      if (h) top = caret.top - box.top + (caret.bottom - caret.top - h) / 2;
      const w = helperEl.offsetWidth;
      const maxLeft = wrapper.clientWidth - w - 4;
      if (w && left > maxLeft) left = Math.max(4, maxLeft);
    }
    pos = { top, left };
  }

  function evaluate() {
    const show = floatingHelperVisible(editor, { focused, suppressed });
    if (show) updatePosition();
    visible = show;
    /* placeholder 겹침 방지 — 근거는 `FLOATING_HELPER_ON_CLASS` 주석. */
    editor.view.dom.classList.toggle(FLOATING_HELPER_ON_CLASS, show);
  }

  $effect(() => {
    focused = editor.view.hasFocus();
    const onFocus = () => {
      focused = true;
    };
    const onBlur = () => {
      focused = false;
    };
    editor.on("transaction", evaluate);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    return () => {
      editor.off("transaction", evaluate);
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
      editor.view.dom.classList.remove(FLOATING_HELPER_ON_CLASS);
    };
  });

  /* 포커스·suppressed 가 바뀌면 재판정 (트랜잭션 없이 바뀌는 두 축). */
  $effect(() => {
    focused;
    suppressed;
    evaluate();
  });

  /* 마운트 직후 실측(폭·높이)으로 한 번 더 자리를 잡는다. */
  $effect(() => {
    if (visible && helperEl) updatePosition();
  });

  /* 래퍼 안쪽이 스크롤되는 호스트 대비 — 슬래시·이모지 메뉴와 같은 캡처 구독. */
  $effect(() => {
    if (!visible) return;
    const onMove = () => updatePosition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  });
</script>

{#if visible}
  <!--
    mousedown preventDefault: 버튼을 누르는 순간 에디터가 blur 되면 클릭이 닿기 전에
    헬퍼가 사라진다(버튼과 함께). 포커스를 아예 뺏기지 않는 쪽이 main 의
    `setTimeout(focus)` 복원보다 깔끔하다 — 툴바들이 쓰는 표준 수법.
  -->
  <div
    bind:this={helperEl}
    class="hce-floating-helper"
    style="top: {pos.top}px; left: {pos.left}px"
    role="toolbar"
    tabindex="-1"
    aria-label={t('emptyLineTools')}
    onmousedown={(e) => e.preventDefault()}
  >
    <div class="hce-floating-helper-inner">
      <span class="hce-floating-helper-hint">{t('floatingHint')}{hasButtons ? t('floatingHintOr') : ""}</span>
      {#if showMath}
        <button
          type="button"
          class="hce-floating-plus"
          title={t('math')}
          aria-label={t('insertMath')}
          onclick={() => helperInsertMath(editor)}
        >
          <Sigma size={14} />
        </button>
      {/if}
      {#if showCode}
        <button
          type="button"
          class="hce-floating-plus"
          title={t('codeBlock')}
          aria-label={t('insertCodeBlock')}
          onclick={() => helperInsertCodeBlock(editor)}
        >
          <Code2 size={14} />
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  /*
   * ⚠️ `position:absolute` + `width:max-content` 는 **여기 고정**이다 — 위치·크기가
   * 런타임 계산보다 먼저 서 있어야 실측 보정(`updatePosition`)이 옳은 폭을 잰다.
   * z-index 100: 정올 sticky 브레드크럼(z:93)보다 위, 모달(z-50=50 계열 Tailwind 층과는
   * 별개 스택) 아래를 노린 값.
   */
  .hce-floating-helper {
    position: absolute;
    width: -moz-max-content;
    width: max-content;
    z-index: 100;
    pointer-events: auto;
  }

  /* 등장 애니메이션은 안쪽에만 — 바깥 transform 은 위치 계산과 충돌한다. */
  .hce-floating-helper-inner {
    display: flex;
    align-items: center;
    gap: 6px;
    animation: hce-floating-helper-in 0.18s ease-out;
  }

  @keyframes hce-floating-helper-in {
    from {
      opacity: 0;
      transform: translateX(-4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hce-floating-helper-inner {
      animation: none;
    }
  }

  .hce-floating-helper-hint {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    opacity: 0.6;
    pointer-events: none;
    -webkit-user-select: none;
       -moz-user-select: none;
            user-select: none;
    white-space: nowrap;
  }
</style>
