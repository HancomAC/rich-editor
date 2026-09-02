<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import type { Snippet } from "svelte";
  import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Minus,
    ImageIcon,
    FileText,
    Code2,
    ChevronDown,
    Undo,
    Redo,
    Table as TableIcon,
    CheckSquare,
    ChevronRight,
    Paperclip,
    Columns2,
    Columns3,
    PanelTop,
    SquareDashed,
    Tv,
    Youtube,
    Plus,
    Pilcrow,
    Sigma,
  } from "lucide-svelte";
  import { cn } from "../utils/cn";
  import { insertTableSized } from "../utils/table";
  import ToggleHeadingIcon from "./icons/ToggleHeadingIcon.svelte";
  import InputModal from "./InputModal.svelte";
  import type { ToolbarFeature, PromptHandler } from "../types";

  let {
    editor,
    features,
    onPdfClick,
    onImageClick,
    onFileClick,
    onPromptLink,
    onPromptMbus,
    onPromptVideo,
    toolbarEnd,
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    /**
     * 이미지 넣기. **툴바는 무엇을 넣을지 정하지 않는다** — 업로드/링크 탭 모달을 띄울지
     * URL 만 물을지는 에디터가 정한다(`TipTapEditor` 의 `pickImage`).
     * 예전엔 여기서 `onPromptImage` 를 직접 불러 URL 만 받았고, 그래서 툴바로는
     * 내 컴퓨터의 그림을 넣을 방법이 없었다.
     */
    onImageClick: () => void;
    onFileClick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /** 영상 URL 프롬프트. 미제공 시 내장 InputModal 폴백 */
    onPromptVideo?: PromptHandler;
    /**
     * 툴바 **오른쪽 끝**에 호스트가 끼워 넣는 조각(예: HTML ↔ 에디터 토글).
     *
     * 이게 없으면 호스트는 툴바 위에 `position: absolute` 로 띄우는 수밖에 없는데,
     * 그러면 툴바 버튼들과 세로 정렬이 맞지 않고(사용자 지적) 좁은 폭에서는 겹친다.
     * 여기에 넣으면 툴바의 flex 행에 그대로 얹혀 정렬이 저절로 맞는다.
     */
    toolbarEnd?: Snippet;
  } = $props();

  /*
   * ⚠️ **툴바가 스스로 다시 그려지게 하는 장치.**
   *
   * `editor` 는 TipTap 이 만든 평범한 객체라 `$state` 가 아니다. 그래서 선택이 바뀌거나
   * 서식이 켜져도 Svelte 는 아무것도 모르고, `editor.isActive('bold')` 를 다시 읽지 않는다
   * — 버튼이 영영 비활성 모양으로 남는다(실측: `isActive` 는 true 인데 클래스는 그대로).
   *
   * 예전엔 `onTransaction` 에서 `editor = editor` 로 밀어 줬는데 그건 **Svelte 4 관용구**다.
   * rune 에서는 같은 참조를 다시 대입해도 아무 일도 일어나지 않는다.
   *
   * 대신 트랜잭션마다 카운터를 올리고, 활성 여부를 읽는 자리에서 그 카운터를 함께 읽는다
   * (쉼표 연산자). 그러면 Svelte 가 "이 표현식은 tick 에 의존한다"고 알아채 다시 계산한다.
   */
  let tick = $state(0);
  $effect(() => {
    const bump = () => tick++;
    editor.on("transaction", bump);
    return () => {
      editor.off("transaction", bump);
    };
  });
  const isActive = (...args: Parameters<Editor["isActive"]>) =>
    (tick, editor.isActive(...args));
  /**
   * ⚠️ `isActive` 만 고쳐서는 부족했다. **되돌리기 가능 여부**와 **지금 글자색**도
   * 매 트랜잭션마다 다시 읽어야 하는데, 그냥 `editor.can()` / `editor.getAttributes()` 를
   * 부르면 Svelte 가 의존성을 못 봐서 처음 값에 굳는다 —
   * 되돌리기가 영영 비활성으로 남고(사용자 지적), 글자색 버튼은 한 번 켜지면 색을 꺼도
   * 계속 켜진 채였다.
   */
  const canDo = (fn: (c: ReturnType<Editor["can"]>) => boolean) =>
    (tick, fn(editor.can()));

  const has = (f: ToolbarFeature) => features.has(f);

  const iconSize = 16;

  let blockMenuOpen = $state(false);
  let insertMenuOpen = $state(false);
  let modalState: { type: "mbus" | "video" } | null = $state(null);
  let blockMenuEl: HTMLDivElement | undefined = $state();
  let insertMenuEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!blockMenuOpen && !insertMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (blockMenuEl && !blockMenuEl.contains(e.target as Node))
        blockMenuOpen = false;
      if (insertMenuEl && !insertMenuEl.contains(e.target as Node))
        insertMenuOpen = false;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        blockMenuOpen = false;
        insertMenuOpen = false;
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  function addImage() {
    insertMenuOpen = false;
    onImageClick();
  }

  async function addVideo() {
    insertMenuOpen = false;
    if (onPromptVideo) {
      const url = await onPromptVideo("");
      if (!url) return;
      editor.chain().focus().setVideoEmbed({ src: url }).run();
      return;
    }
    modalState = { type: "video" };
  }

  async function addMbus() {
    insertMenuOpen = false;
    if (onPromptMbus) {
      const url = await onPromptMbus("");
      if (!url) return;
      editor.chain().focus().setMbusVideo({ src: url }).run();
      return;
    }
    modalState = { type: "mbus" };
  }

  const currentBlockLabel = $derived.by(() => {
    if (isActive("heading", { level: 1 })) return "제목 1";
    if (isActive("heading", { level: 2 })) return "제목 2";
    if (isActive("heading", { level: 3 })) return "제목 3";
    if (isActive("bulletList")) return "글머리 목록";
    if (isActive("orderedList")) return "번호 목록";
    if (isActive("taskList")) return "체크리스트";
    if (isActive("blockquote")) return "인용문";
    if (isActive("details")) {
      // 토글 제목이면 단계까지 보여 준다 — 그냥 "토글" 이면 무엇을 고른 건지 안 보인다.
      for (const lv of [1, 2, 3]) {
        if (isActive("detailsSummary", { level: lv })) return `토글 제목 ${lv}`;
      }
      return "토글";
    }
    return "본문";
  });

  function runBlock(fn: () => void) {
    fn();
    blockMenuOpen = false;
  }

  function runInsert(fn: () => void) {
    fn();
    insertMenuOpen = false;
  }

  /* ⚠️ `link` 는 여기 없다 — 인라인 서식 그룹으로 옮겼다(위 주석 참고). */
  const hasInsertItems = $derived(
    has("image") ||
      has("pdf") ||
      has("file") ||
      has("mbus") ||
      has("video") ||
      has("table") ||
      has("columns-2") ||
      has("columns-3") ||
      has("tabs") ||
      has("horizontal-rule") ||
      has("code-block") ||
      has("math"),
  );

  const hasBlockItems = $derived(
    has("h1") ||
      has("h2") ||
      has("h3") ||
      has("bullet-list") ||
      has("ordered-list") ||
      has("checklist") ||
      has("blockquote") ||
      has("toggle"),
  );
</script>

<div
  class="hce-toolbar sticky z-30 flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border bg-background rounded-t-xl"
  style="top: var(--header-height, 74px)"
>
  {#if has('undo') || has('redo')}
  <!-- Undo / Redo -->
  <div class="hce-toolbar-group">
    {#if has('undo')}
    <button
      type="button"
      onclick={() => editor.chain().focus().undo().run()}
      disabled={!canDo((c) => c.undo())}
      aria-label="실행 취소"
      class={cn(
        "p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
        !canDo((c) => c.undo()) && "opacity-30 pointer-events-none",
      )}
    >
      <Undo size={iconSize} />
    </button>
    {/if}
    {#if has('redo')}
    <button
      type="button"
      onclick={() => editor.chain().focus().redo().run()}
      disabled={!canDo((c) => c.redo())}
      aria-label="다시 실행"
      class={cn(
        "p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
        !canDo((c) => c.redo()) && "opacity-30 pointer-events-none",
      )}
    >
      <Redo size={iconSize} />
    </button>
    {/if}
  </div>
  {/if}

  {#if hasBlockItems}
  <!-- Block type selector -->
  <div class="hce-toolbar-group">
    <div bind:this={blockMenuEl} class="relative">
      <button
        type="button"
        onclick={() => (blockMenuOpen = !blockMenuOpen)}
        aria-label="블록 타입"
        class="flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground min-w-[96px]"
      >
        <span class="text-sm">{currentBlockLabel}</span>
        <ChevronDown size={12} />
      </button>
      {#if blockMenuOpen}
        <div
          class="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1"
          style="min-width: 236px"
          onmousedown={(e) => e.preventDefault()}
          role="menu"
          tabindex="-1"
        >
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              !isActive("heading") &&
                !isActive("bulletList") &&
                !isActive("orderedList") &&
                !isActive("taskList") &&
                !isActive("blockquote") &&
                !isActive("codeBlock") &&
                !isActive("details") &&
                "hce-active",
            )}
            onclick={() =>
              runBlock(() => editor.chain().focus().setParagraph().run())}
          >
            <Pilcrow size={14} /> 본문
          </button>
          {#if has('h1')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("heading", { level: 1 }) && "hce-active",
            )}
            onclick={() =>
              runBlock(() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run(),
              )}
          >
            <Heading1 size={14} /> 제목 1
            <span class="hce-menu-shortcut"># </span>
          </button>
          {/if}
          {#if has('h2')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("heading", { level: 2 }) && "hce-active",
            )}
            onclick={() =>
              runBlock(() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run(),
              )}
          >
            <Heading2 size={14} /> 제목 2
            <span class="hce-menu-shortcut">## </span>
          </button>
          {/if}
          {#if has('h3')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("heading", { level: 3 }) && "hce-active",
            )}
            onclick={() =>
              runBlock(() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run(),
              )}
          >
            <Heading3 size={14} /> 제목 3
            <span class="hce-menu-shortcut">### </span>
          </button>
          {/if}
          {#if has('bullet-list') || has('ordered-list') || has('checklist')}
          <div class="h-px bg-border my-1"></div>
          {/if}
          {#if has('bullet-list')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("bulletList") && "hce-active",
            )}
            onclick={() =>
              runBlock(() => editor.chain().focus().toggleBulletList().run())}
          >
            <List size={14} /> 글머리 목록
            <span class="hce-menu-shortcut">- </span>
          </button>
          {/if}
          {#if has('ordered-list')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("orderedList") && "hce-active",
            )}
            onclick={() =>
              runBlock(() => editor.chain().focus().toggleOrderedList().run())}
          >
            <ListOrdered size={14} /> 번호 목록
            <span class="hce-menu-shortcut">1. </span>
          </button>
          {/if}
          {#if has('checklist')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("taskList") && "hce-active",
            )}
            onclick={() =>
              runBlock(() => editor.chain().focus().toggleTaskList().run())}
          >
            <CheckSquare size={14} /> 체크리스트
            <span class="hce-menu-shortcut">[] </span>
          </button>
          {/if}
          {#if has('blockquote') || has('toggle')}
          <div class="h-px bg-border my-1"></div>
          {/if}
          {#if has('blockquote')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("blockquote") && "hce-active",
            )}
            onclick={() =>
              runBlock(() => editor.chain().focus().toggleBlockquote().run())}
          >
            <Quote size={14} /> 인용문
            <span class="hce-menu-shortcut">" </span>
          </button>
          {/if}
          {#if has('toggle')}
          <button
            type="button"
            class={cn(
              "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
              isActive("details") && "hce-active",
            )}
            onclick={() =>
              runBlock(() => editor.chain().focus().setDetails().run())}
          >
            <ChevronRight size={14} /> 토글
            <span class="hce-menu-shortcut">> </span>
          </button>
          <!--
            토글 제목 — 접히는 제목. 만드는 일은 입력 규칙(`# > `)과 **같은 커맨드**가 한다.
            제목 바로 아래에 두는 게 맞지만 이 메뉴는 `본문 → 제목 → 목록 → 블록` 순이라,
            토글 옆에 붙여 **접히는 것끼리** 모은다.

            ⚠️ 아이콘은 `제목 N` 과 **달라야 한다.** 한동안 둘 다 lucide `HeadingN` 이라 메뉴에서
            구분이 안 됐다(사용자 지적) — 삼각형이 붙은 `ToggleHeadingIcon` 을 쓴다.
          -->
          {#each [1, 2, 3] as level}
            <button
              type="button"
              class={cn(
                "w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted",
                isActive("detailsSummary", { level }) && "hce-active",
              )}
              onclick={() =>
                runBlock(() =>
                  editor
                    .chain()
                    .focus()
                    .setToggleHeading(level as 1 | 2 | 3)
                    .run(),
                )}
            >
              <ToggleHeadingIcon size={14} level={level as 1 | 2 | 3} /> 토글 제목 {level}
              <span class="hce-menu-shortcut">{'#'.repeat(level)} &gt; </span>
            </button>
          {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>
  {/if}

  {#if has('bold') || has('italic') || has('underline') || has('strike')}
  <!--
    인라인 서식. **글자에 붙는 것은 전부 여기 모은다** — 굵게·기울임·밑줄·취소선에
    `코드`(`<code>`)와 `링크`가 더해진다.

    ⚠️ `링크` 는 원래 `삽입` 드롭다운에 있었다. 하지만 링크는 표·PDF 처럼 **새 덩어리를
    끼워 넣는 것**이 아니라 **선택한 글자에 씌우는 서식**이라, 쓰려면 글자를 골라 둔 상태에서
    메뉴를 두 번 여는 꼴이었다(사용자 요청으로 이동). 삽입 쪽에는 이제 없다.
  -->
  <div class="hce-toolbar-group">
    {#if has('bold')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleBold().run()}
      aria-label="굵게"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive("bold")
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Bold size={iconSize} />
    </button>
    {/if}
    {#if has('italic')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleItalic().run()}
      aria-label="기울임"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive("italic")
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Italic size={iconSize} />
    </button>
    {/if}
    {#if has('underline')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleUnderline().run()}
      aria-label="밑줄"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive("underline")
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <UnderlineIcon size={iconSize} />
    </button>
    {/if}
    {#if has('strike')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleStrike().run()}
      aria-label="취소선"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive("strike")
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Strikethrough size={iconSize} />
    </button>
    {/if}
    <!--
      ⚠️ **`코드`·`링크`·`수식`·`글자색` 은 여기 없다 — 버블 툴바에 있다**(사용자 결정).

      이 넷은 **글자를 골라 놓고** 쓰는 것이라, 고르는 순간 뜨는 버블이 손에 더 가깝다.
      고정 툴바에도 두면 같은 버튼이 두 벌이 되고 인라인 그룹만 여덟 칸을 먹는다.
      남긴 `굵게·기울임·밑줄·취소선` 은 **선택 없이 켜 두고 이어 치는** 쓰임이 있어서
      늘 보이는 자리가 필요하다.

      ⚠️ 빈 선택에서 **인라인 수식을 새로 넣던 길**은 이 버튼이 유일했으므로,
         `삽입` 드롭다운으로 옮겨 두었다(아래 `인라인 수식`).
    -->
  </div>
  {/if}

  {#if has('align-left') || has('align-center') || has('align-right')}
  <!-- Alignment -->
  <div class="hce-toolbar-group">
    {#if has('align-left')}
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign('left').run()}
      aria-label="왼쪽 정렬"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive({ textAlign: 'left' })
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <AlignLeft size={iconSize} />
    </button>
    {/if}
    {#if has('align-center')}
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign('center').run()}
      aria-label="가운데 정렬"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive({ textAlign: 'center' })
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <AlignCenter size={iconSize} />
    </button>
    {/if}
    {#if has('align-right')}
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign('right').run()}
      aria-label="오른쪽 정렬"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive({ textAlign: 'right' })
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <AlignRight size={iconSize} />
    </button>
    {/if}
  </div>
  {/if}

  {#if hasInsertItems}
  <!-- Insert + dropdown -->
  <div class="hce-toolbar-group">
    <div bind:this={insertMenuEl} class="relative">
      <button
        type="button"
        onclick={() => (insertMenuOpen = !insertMenuOpen)}
        aria-label="삽입"
        class="flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus size={iconSize} />
        <span class="text-sm">삽입</span>
        <ChevronDown size={12} />
      </button>
      {#if insertMenuOpen}
        <div
          class="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1"
          style="min-width: 236px"
        >
          {#if has('code-block')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setCodeBlock().run())}
          >
            <Code2 size={14} /> 코드 블록
            <span class="hce-menu-shortcut">```</span>
          </button>
          {/if}
          {#if has('math')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().promptMathDisplay().run())}
          >
            <Sigma size={14} /> 수식 블록
            <span class="hce-menu-shortcut">$$</span>
          </button>
          <!--
            ⚠️ **빈 선택에서 인라인 수식을 새로 넣는 유일한 길**이다.
            예전엔 인라인 그룹의 `Σ` 버튼이 그 일을 했는데(선택이 없으면 프롬프트를 열었다)
            그 버튼을 버블로 옮기면서 길이 끊겼다 — 버블은 뭔가 골라야만 뜨기 때문이다.
            (`$…$` 를 쳐서 만드는 입력 규칙은 그대로 살아 있다.)
          -->
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().promptMathInline().run())}
          >
            <Sigma size={14} /> 인라인 수식
            <span class="hce-menu-shortcut">$ $</span>
          </button>
          {/if}
          {#if has('pdf')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => runInsert(onPdfClick)}
          >
            <FileText size={14} /> PDF
          </button>
          {/if}
          {#if has('file') && onFileClick}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => runInsert(onFileClick!)}
          >
            <Paperclip size={14} /> 파일
          </button>
          {/if}
          {#if has('table')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() =>
                insertTableSized(editor, { rows: 3, cols: 3, withHeaderRow: true }),
              )}
          >
            <TableIcon size={14} /> 표 (3x3)
          </button>
          {/if}

          {#if has('horizontal-rule') || has('columns-2') || has('columns-3') || has('tabs') || has('card')}
          <div class="h-px bg-border my-1"></div>
          {/if}
          {#if has('horizontal-rule')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() =>
                editor.chain().focus().setHorizontalRule().run(),
              )}
          >
            <Minus size={14} /> 구분선
            <span class="hce-menu-shortcut">---</span>
          </button>
          {/if}
          {#if has('columns-2')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setColumns(2).run())}
          >
            <Columns2 size={14} /> 2단 컬럼
          </button>
          {/if}
          {#if has('columns-3')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setColumns(3).run())}
          >
            <Columns3 size={14} /> 3단 컬럼
          </button>
          {/if}
          {#if has('tabs')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setTabs(3).run())}
          >
            <PanelTop size={14} /> 탭
          </button>
          {/if}
          {#if has('card')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => runInsert(() => editor.chain().focus().setCard().run())}
          >
            <SquareDashed size={14} /> 카드
          </button>
          {/if}

          {#if has('image') || has('mbus') || has('video')}
          <div class="h-px bg-border my-1"></div>
          {/if}
          {#if has('image')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={addImage}
          >
            <ImageIcon size={14} /> 이미지
          </button>
          {/if}
          {#if has('video')}
          <!--
            유튜브·Vimeo 등 바깥 영상. 붙여넣은 주소를 임베드용으로 바꿔 주므로
            `watch?v=…` 를 그대로 넣어도 된다(`extensions/VideoEmbed.ts`).
          -->
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={addVideo}
          >
            <Youtube size={14} /> 영상
          </button>
          {/if}
          {#if has('mbus')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={addMbus}
          >
            <Tv size={14} /> 미디버스 영상
          </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  {/if}

  <!-- Modals -->
  <!-- (이미지 모달은 없다 — 에디터가 업로드/링크 탭 모달을 띄운다. `onImageClick` 참고.) -->
  {#if modalState?.type === "video"}
    <InputModal
      title="영상 URL"
      placeholder="https://www.youtube.com/watch?v=..."
      onConfirm={(url) => {
        editor.chain().focus().setVideoEmbed({ src: url }).run();
        modalState = null;
      }}
      onCancel={() => (modalState = null)}
    />
  {/if}
  {#if modalState?.type === "mbus"}
    <InputModal
      title="미디버스 영상 URL"
      placeholder="https://play.mbus.tv/v1/hls/..."
      onConfirm={(url) => {
        editor.chain().focus().setMbusVideo({ src: url }).run();
        modalState = null;
      }}
      onCancel={() => (modalState = null)}
    />
  {/if}

  {#if toolbarEnd}
    <div class="hce-toolbar-end">{@render toolbarEnd()}</div>
  {/if}
</div>

<style>
  /* 툴바 버튼 기본 리셋 (Tailwind preflight 비활성화 상태라 UA 기본값 제거) */
  .hce-toolbar :global(button) {
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .hce-toolbar :global(button:disabled) {
    cursor: default;
  }

  /*
   * ── 활성 표시 ──────────────────────────────────────────────────────────
   * ⚠️ **이 규칙은 반드시 위 리셋보다 구체적이어야 한다.** 바로 위
   * `.hce-toolbar :global(button)` 이 `background: transparent; color: inherit` 을 걸어
   * (0,2,1), 유틸리티 클래스 하나짜리(0,1,0)로는 절대 못 이긴다. 그래서 켜진 버튼이
   * **아무 표시도 안 났다** — 오래된 버그다(사용자 지적).
   *
   * 색은 `color-mix` 로 만든다. 호스트 앱이 `--primary` 를 hex 로 주기 때문에 Tailwind 의
   * `bg-primary/10` 같은 투명도 변형은 아예 생성되지 않는다(`.claude/rules/rich-editor.md`).
   */
  .hce-toolbar :global(button.hce-active) {
    background-color: color-mix(in srgb, var(--primary, #3382f2) 12%, transparent);
    color: var(--primary, #3382f2);
  }

  .hce-toolbar :global(button.hce-active:hover) {
    background-color: color-mix(in srgb, var(--primary, #3382f2) 18%, transparent);
  }

  /* 오른쪽 끝으로 밀어 붙인다 — 툴바가 flex 라 auto 마진이면 충분하다. */
  .hce-toolbar-end {
    margin-left: auto;
    display: flex;
    align-items: center;
  }

  .hce-toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-xl, 8px);
    background: color-mix(in srgb, var(--muted, #f6f7f9) 55%, transparent);
  }

  .hce-toolbar-group :global(button) {
    flex-shrink: 0;
  }

  /*
   * 메뉴 항목 오른쪽의 입력 규칙 표시(사용자 요청). 메뉴를 한 번 쓰고 나면 다음부터는
   * 쳐서 만들게 되는 게 목적이라, 눈에 띄되 이름을 가리지 않을 만큼만 흐리게 둔다.
   *
   * ⚠️ **드롭다운은 툴바 밖(`.bg-popover`)에 그려지므로 `:global` 이 필요하다.**
   * ⚠️ `margin-left: auto` 로 오른쪽 끝에 붙이고 `flex-shrink: 0` 으로 지킨다 —
   * 안 그러면 이름이 길 때 `# >` 쪽이 먼저 찌그러진다.
   */
  :global(.hce-menu-shortcut) {
    margin-left: auto;
    flex-shrink: 0;
    padding-left: 10px;
    font-size: 11px;
    font-weight: 400;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--muted-foreground);
    opacity: 0.75;
    white-space: pre;
  }
</style>
