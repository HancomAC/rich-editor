<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import {
    findEmojiQuery,
    searchEmojis,
    type EmojiSuggestion,
  } from "../utils/emoji-suggestion";

  /*
   * 이모지 `:` 자동완성의 **화면 절반** — 판정·검색은 `utils/emoji-suggestion.ts`.
   *
   * 슬래시 메뉴와 달리 상태(열림·위치·검색어)를 이 컴포넌트가 전부 들고 있다.
   * `TipTapEditor` 는 마운트만 한다 — 에디터 update/selectionUpdate 를 여기서 직접
   * 구독하므로 에디터 쪽에 끼워 넣을 배선이 없다.
   *
   * 키보드는 슬래시 메뉴(`SlashCommandMenu`)와 같은 방식: 문서 캡처 단계에서 가로챈다.
   * `preventDefault` 만으로 충분하다 — prosemirror-view 는 `defaultPrevented` 인 keydown
   * 을 버린다(설치본 `input.ts` 확인). Tab 이동은 main(emoji.ts)에서 가져온 것이다.
   */
  /*
   * `onOpenChange` 는 실표시(`visible`) 기준 알림이다 — `TipTapEditor` 가 빈 줄 플로팅
   * 헬퍼를 이 팝업과 동시에 띄우지 않으려고 받는다. 열려 있어도 후보가 없어 안 그리면
   * (`visible` 주석) 닫힌 것으로 알린다.
   */
  let {
    editor,
    onOpenChange,
  }: { editor: Editor; onOpenChange?: (open: boolean) => void } = $props();

  let open = $state(false);
  let pos = $state({ top: 0, left: 0 });
  let query = $state("");
  let range: { from: number; to: number } | null = null;
  let selectedIndex = $state(0);
  let menuEl: HTMLDivElement | undefined = $state();
  let mouseMovedSinceKeyboard = $state(true);

  const items = $derived(searchEmojis(query));
  /*
   * 열려 있어도 후보가 없으면 **없는 것처럼** 군다 — 빈 상자를 띄우지 않고, 키보드도
   * 가로채지 않는다(`:x` 뒤에 일반 문장을 이어 칠 때 Enter 를 뺏으면 안 된다).
   */
  const visible = $derived(open && items.length > 0);

  $effect(() => {
    onOpenChange?.(visible);
    /* 열린 채로 내려가는 경우(editable 전환 등)에도 닫힘을 알린다. */
    return () => {
      if (visible) onOpenChange?.(false);
    };
  });

  const MENU_HEIGHT = 320;

  /* `updateSlashMenuPosition`(TipTapEditor)과 같은 계산 — 고정 툴바·하단 바를 피해 뒤집는다. */
  function updatePosition() {
    if (!range) return;
    const coords = editor.view.coordsAtPos(range.to);

    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-height",
      ) || "74",
    );
    const toolbarEl = editor.view.dom
      .closest(".hce-editor-wrapper")
      ?.querySelector(".sticky");
    const toolbarBottom = toolbarEl
      ? toolbarEl.getBoundingClientRect().bottom
      : headerHeight;
    const topSafe = Math.max(toolbarBottom, headerHeight) + 4;

    const bottomBar = document.querySelector(".sticky.bottom-0");
    const bottomBarHeight = bottomBar
      ? bottomBar.getBoundingClientRect().height
      : 0;
    const bottomSafe = window.innerHeight - bottomBarHeight - 4;

    const spaceBelow = bottomSafe - coords.bottom;
    const spaceAbove = coords.top - topSafe;
    const goUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;

    let top: number;
    if (goUp) {
      top = Math.max(topSafe, coords.top - MENU_HEIGHT);
    } else {
      top = Math.min(coords.bottom + 4, bottomSafe - MENU_HEIGHT);
    }

    pos = { top, left: coords.left };
  }

  function close() {
    open = false;
    range = null;
    query = "";
  }

  /* 문서가 바뀔 때(타이핑) — 열고 닫기 전부 판정한다. */
  function handleUpdate() {
    const match = findEmojiQuery(editor.state);
    if (!match) {
      if (open) close();
      return;
    }
    range = { from: match.from, to: match.to };
    if (match.query !== query) {
      query = match.query;
      selectedIndex = 0;
    }
    open = true;
    updatePosition();
  }

  /*
   * 선택만 움직일 때(클릭·화살표 이동)는 **닫기만** 판정한다 — 슬래시 메뉴의
   * `handleSelectionUpdate` 와 같은 비대칭. 옛 `:word` 텍스트를 클릭했다고 팝업이
   * 열리면 안 된다.
   */
  function handleSelectionUpdate() {
    if (!open) return;
    if (!findEmojiQuery(editor.state)) close();
  }

  $effect(() => {
    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  });

  function select(item: EmojiSuggestion) {
    if (!range) return;
    const { from, to } = range;
    close();
    // main 과 같은 삽입 꼴 — `:query` 를 지우고 이모지 + 공백.
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(`${item.emoji} `)
      .run();
  }

  $effect(() => {
    if (!visible) return;
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  });

  $effect(() => {
    if (!visible) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handleMouseDown, true);
    return () =>
      document.removeEventListener("mousedown", handleMouseDown, true);
  });

  $effect(() => {
    if (!visible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        mouseMovedSinceKeyboard = false;
        selectedIndex = (selectedIndex + 1) % items.length;
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        mouseMovedSinceKeyboard = false;
        selectedIndex =
          selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item) select(item);
      } else if (e.key === "Escape") {
        // main 처럼 친 텍스트는 남기고 팝업만 접는다(다음 글자를 치면 다시 뜬다).
        e.preventDefault();
        open = false;
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  });

  $effect(() => {
    // 선택 항목을 보이는 자리로
    if (menuEl) {
      const el = menuEl.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  });
</script>

{#if visible}
  <div class="fixed z-50" style="top: {pos.top}px; left: {pos.left}px">
    <div
      bind:this={menuEl}
      class="emoji-menu z-50 bg-popover border border-border rounded-xl shadow-xl overflow-y-auto py-1.5"
    >
      {#each items as item, i (item.keyword)}
        <button
          type="button"
          data-index={i}
          class="emoji-item {i === selectedIndex ? 'is-selected' : ''}"
          onmousemove={() => {
            if (!mouseMovedSinceKeyboard) {
              mouseMovedSinceKeyboard = true;
              return;
            }
            selectedIndex = i;
          }}
          onclick={() => select(item)}
        >
          <span class="emoji-glyph">{item.emoji}</span>
          <span class="emoji-keyword">{item.keyword}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .emoji-menu {
    width: 224px;
    max-height: 320px;
  }

  /* `SlashCommandMenu` 의 .slash-item 과 같은 결 — 두 팝업이 같은 물건으로 보여야 한다. */
  .emoji-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 10px;
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: var(--foreground);
    background: transparent;
    border: 0;
    cursor: pointer;
    transition: background-color 0.12s;
  }

  .emoji-item:hover,
  .emoji-item.is-selected {
    background: color-mix(in srgb, var(--primary) 8%, transparent);
    color: var(--primary);
  }

  .emoji-item.is-selected::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3px;
    bottom: 3px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--primary);
  }

  .emoji-glyph {
    flex-shrink: 0;
    width: 20px;
    font-size: 15px;
    line-height: 1;
    text-align: center;
  }

  .emoji-keyword {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: var(--muted-foreground);
  }

  .emoji-item.is-selected .emoji-keyword,
  .emoji-item:hover .emoji-keyword {
    color: var(--primary);
  }
</style>
