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
    LinkIcon,
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
    SquareDashed,
    Tv,
    Plus,
    Pilcrow,
    Palette,
    Sigma,
  } from "lucide-svelte";
  import { cn } from "../utils/cn";
  import InputModal from "./InputModal.svelte";
  import type { ToolbarFeature, PromptHandler } from "../types";

  let {
    editor,
    features,
    onPdfClick,
    onFileClick,
    onPromptLink,
    onPromptImage,
    onPromptMbus,
    toolbarEnd,
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    onFileClick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
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
  const attrOf = (name: string, key: string) =>
    (tick, editor.getAttributes(name)[key] as string | undefined);

  const has = (f: ToolbarFeature) => features.has(f);

  const iconSize = 16;

  let blockMenuOpen = $state(false);
  let insertMenuOpen = $state(false);
  let colorMenuOpen = $state(false);
  let modalState: { type: "link" | "image" | "mbus" } | null = $state(null);
  let blockMenuEl: HTMLDivElement | undefined = $state();
  let insertMenuEl: HTMLDivElement | undefined = $state();
  let colorMenuEl: HTMLDivElement | undefined = $state();

  /*
   * ⚠️ **`검정(#000000)` 은 뺐다.** `기본`(×, 색 지정 해제)과 눈으로 구별이 안 되는데
   * (본문 기본색이 거의 검정이다) 두 가지가 다 있으면 헷갈린다 — 사용자가 짚은 부분이다.
   *
   * 남기는 쪽은 **`기본`** 이다. `검정` 만 남기면 본문 기본색으로 **되돌릴 방법이 없어지고**,
   * 저장된 HTML 에 `#000000` 이 눌러앉는다. 그 글은 다크 모드에서 검정 글자가 되어
   * 안 보인다(코드패스가 `sanitizeBodyColors` 로 이 자국을 걷어내고 있는 이유다).
   *
   * `브랜드` 는 앱마다 다르므로 값을 고정하지 않고 `--primary` 를 읽는다 —
   * 정올과 코드패스가 각자 자기 색을 얻는다. 저장은 계산된 실제 색으로 한다
   * (`var(--primary)` 를 그대로 저장하면 앱 밖에서 렌더할 때 색이 사라진다).
   *
   * ⚠️ **아홉 개로 맞춰 둔다.** 팔레트가 `grid-cols-3` 라 여덟 개면 마지막 줄에 빈 칸이
   * 남아 덜 만든 것처럼 보인다(사용자 지적). `기본` + 색 여덟이 3×3 을 정확히 채운다.
   * 색은 색상환을 고르게 훑도록 골랐다 — 빨강·주황·노랑·초록·파랑에 브랜드(남보라)와
   * 그 사이를 메우는 분홍, 그리고 무채색 회색. 여기서 더 늘리려면 12개(3×4)로 가야 한다.
   */
  const TEXT_COLORS: { label: string; value: string; cssVar?: string }[] = [
    { label: "기본", value: "" },
    { label: "브랜드", value: "", cssVar: "--primary" },
    { label: "회색", value: "#6b7280" },
    { label: "빨강", value: "#dc2626" },
    { label: "주황", value: "#ea580c" },
    { label: "노랑", value: "#ca8a04" },
    { label: "초록", value: "#16a34a" },
    { label: "파랑", value: "#2563eb" },
    { label: "분홍", value: "#db2777" }
  ];

  /** `--primary` 같은 CSS 변수를 그 자리에서 실제 색 문자열로 바꾼다. */
  function resolveCssVar(el: HTMLElement, name: string): string {
    return getComputedStyle(el).getPropertyValue(name).trim();
  }

  $effect(() => {
    if (!blockMenuOpen && !insertMenuOpen && !colorMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (blockMenuEl && !blockMenuEl.contains(e.target as Node))
        blockMenuOpen = false;
      if (insertMenuEl && !insertMenuEl.contains(e.target as Node))
        insertMenuOpen = false;
      if (colorMenuEl && !colorMenuEl.contains(e.target as Node))
        colorMenuOpen = false;
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        blockMenuOpen = false;
        insertMenuOpen = false;
        colorMenuOpen = false;
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  async function addLink() {
    insertMenuOpen = false;
    if (onPromptLink) {
      const previous = isActive("link")
        ? (editor.getAttributes("link").href as string) || ""
        : "";
      const url = await onPromptLink(previous);
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      }
      return;
    }
    modalState = { type: "link" };
  }

  async function addImage() {
    insertMenuOpen = false;
    if (onPromptImage) {
      const url = await onPromptImage("");
      if (!url) return;
      editor.chain().focus().setImage({ src: url }).run();
      return;
    }
    modalState = { type: "image" };
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
    if (isActive("details")) return "토글";
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

  const hasInsertItems = $derived(
    has("image") ||
      has("link") ||
      has("pdf") ||
      has("file") ||
      has("mbus") ||
      has("table") ||
      has("columns-2") ||
      has("columns-3") ||
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
      data-tooltip="실행 취소"
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
      data-tooltip="다시 실행"
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
        data-tooltip="블록 타입"
        aria-label="블록 타입"
        class="flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground min-w-[96px]"
      >
        <span class="text-sm">{currentBlockLabel}</span>
        <ChevronDown size={12} />
      </button>
      {#if blockMenuOpen}
        <div
          class="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1"
          style="min-width: 200px"
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
          </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  {/if}

  {#if has('bold') || has('italic') || has('underline') || has('strike')}
  <!-- Inline marks (core 4) -->
  <div class="hce-toolbar-group">
    {#if has('bold')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleBold().run()}
      data-tooltip="굵게"
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
      data-tooltip="기울임"
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
      data-tooltip="밑줄"
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
      data-tooltip="취소선"
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
    {#if has('math')}
    <!--
      선택한 텍스트를 인라인 수식으로 감싸고, 이미 수식인 자리에서 누르면 원문으로 되돌린다
      (구세대 `setMath.js` 와 같은 토글). 선택이 없으면 감쌀 게 없으니 프롬프트로 새로 넣는다.

      ⚠️ **`run()` 의 반환값으로 갈라지면 안 된다.** `chain().focus().toggleMathInline().run()`
      은 감싸기가 실제로 성공해도 false 를 돌려주는 경우가 있어(체인의 다른 단계가 false 를
      섞는다), 감싸 놓고 프롬프트까지 같이 여는 걸 브라우저에서 확인했다.
      **무엇을 할지는 실행 전에 상태로 정한다.**
    -->
    <button
      type="button"
      onclick={() => {
        if (editor.state.selection.empty && !editor.isActive('math_inline')) {
          editor.chain().focus().promptMathInline().run();
        } else {
          editor.chain().focus().toggleMathInline().run();
        }
      }}
      data-tooltip="인라인 수식"
      aria-label="인라인 수식"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        isActive("math_inline")
          ? "hce-active"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Sigma size={iconSize} />
    </button>
    {/if}
    {#if has('text-color')}
    <div bind:this={colorMenuEl} class="relative">
      <button
        type="button"
        onclick={() => (colorMenuOpen = !colorMenuOpen)}
        data-tooltip="글자색"
        aria-label="글자색"
        class={cn(
          "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
          attrOf('textStyle', 'color')
            ? "hce-active"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Palette size={iconSize} />
        <ChevronDown size={12} />
      </button>
      {#if colorMenuOpen}
        <div
          class="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 p-2"
          style="min-width: 180px"
          onmousedown={(e) => e.preventDefault()}
          role="menu"
          tabindex="-1"
        >
          <div class="grid grid-cols-3 gap-1.5">
            {#each TEXT_COLORS as c}
              <button
                type="button"
                title={c.label}
                class="h-8 rounded-md border border-border transition-transform hover:scale-105 flex items-center justify-center text-xs font-bold bg-background"
                style="color: {c.cssVar ? `var(${c.cssVar})` : c.value || '#6b7280'}"
                onclick={(e) => {
                  const color = c.cssVar
                    ? resolveCssVar(e.currentTarget as HTMLElement, c.cssVar)
                    : c.value;
                  if (color) {
                    editor.chain().focus().setColor(color).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                  colorMenuOpen = false;
                }}
              >
                {c.cssVar || c.value ? "A" : "×"}
              </button>
            {/each}
          </div>
          <label
            class="mt-2 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
          >
            <span>직접 선택</span>
            <input
              type="color"
              class="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
              value={attrOf('textStyle', 'color') || '#000000'}
              onclick={(e) => e.stopPropagation()}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                editor.chain().focus().setColor(v).run();
              }}
            />
          </label>
        </div>
      {/if}
    </div>
    {/if}
  </div>
  {/if}

  {#if has('align-left') || has('align-center') || has('align-right')}
  <!-- Alignment -->
  <div class="hce-toolbar-group">
    {#if has('align-left')}
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign('left').run()}
      data-tooltip="왼쪽 정렬"
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
      data-tooltip="가운데 정렬"
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
      data-tooltip="오른쪽 정렬"
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
        data-tooltip="삽입"
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
          style="min-width: 220px"
        >
          {#if has('code-block')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setCodeBlock().run())}
          >
            <Code2 size={14} /> 코드 블록
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
            <Paperclip size={14} /> 파일 첨부
          </button>
          {/if}
          {#if has('table')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
              )}
          >
            <TableIcon size={14} /> 표 (3x3)
          </button>
          {/if}

          {#if has('horizontal-rule') || has('columns-2') || has('columns-3') || has('card')}
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
          {#if has('card')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => runInsert(() => editor.chain().focus().setCard().run())}
          >
            <SquareDashed size={14} /> 카드
          </button>
          {/if}

          {#if has('image') || has('link') || has('mbus')}
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
          {#if has('link')}
          <button
            type="button"
            class="w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={addLink}
          >
            <LinkIcon size={14} /> 링크
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
  {#if modalState?.type === "link"}
    <InputModal
      title="링크 URL 입력"
      placeholder="https://example.com"
      defaultValue={isActive("link") ? editor.getAttributes("link").href || "" : ""}
      onConfirm={(url) => {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
        modalState = null;
      }}
      onCancel={() => (modalState = null)}
    />
  {/if}
  {#if modalState?.type === "image"}
    <InputModal
      title="이미지 URL 입력"
      placeholder="https://example.com/image.png"
      onConfirm={(url) => {
        editor.chain().focus().setImage({ src: url }).run();
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
</style>
