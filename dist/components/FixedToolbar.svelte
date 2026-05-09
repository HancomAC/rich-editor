<script lang="ts">
  import type { Editor } from "@tiptap/core";
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
    Tv,
    Plus,
    Pilcrow,
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
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPdfClick: () => void;
    onFileClick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
    onPromptMbus?: PromptHandler;
  } = $props();

  const has = (f: ToolbarFeature) => features.has(f);

  const iconSize = 16;

  let blockMenuOpen = $state(false);
  let insertMenuOpen = $state(false);
  let modalState: { type: "link" | "image" | "mbus" } | null = $state(null);
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

  async function addLink() {
    insertMenuOpen = false;
    if (onPromptLink) {
      const previous = editor.isActive("link")
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
    if (editor.isActive("heading", { level: 1 })) return "제목 1";
    if (editor.isActive("heading", { level: 2 })) return "제목 2";
    if (editor.isActive("heading", { level: 3 })) return "제목 3";
    if (editor.isActive("bulletList")) return "글머리 목록";
    if (editor.isActive("orderedList")) return "번호 목록";
    if (editor.isActive("taskList")) return "체크리스트";
    if (editor.isActive("blockquote")) return "인용문";
    if (editor.isActive("details")) return "토글";
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
      has("code-block"),
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
      disabled={!editor.can().undo()}
      data-tooltip="실행 취소"
      aria-label="실행 취소"
      class={cn(
        "p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
        !editor.can().undo() && "opacity-30 pointer-events-none",
      )}
    >
      <Undo size={iconSize} />
    </button>
    {/if}
    {#if has('redo')}
    <button
      type="button"
      onclick={() => editor.chain().focus().redo().run()}
      disabled={!editor.can().redo()}
      data-tooltip="다시 실행"
      aria-label="다시 실행"
      class={cn(
        "p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
        !editor.can().redo() && "opacity-30 pointer-events-none",
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
        >
          <button
            type="button"
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.isActive("heading") &&
                !editor.isActive("bulletList") &&
                !editor.isActive("orderedList") &&
                !editor.isActive("taskList") &&
                !editor.isActive("blockquote") &&
                !editor.isActive("codeBlock") &&
                !editor.isActive("details") &&
                "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("heading", { level: 1 }) && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("heading", { level: 2 }) && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("heading", { level: 3 }) && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("bulletList") && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("orderedList") && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("taskList") && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("blockquote") && "bg-primary/10 text-primary",
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
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              editor.isActive("details") && "bg-primary/10 text-primary",
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
        editor.isActive("bold")
          ? "bg-primary/10 text-primary"
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
        editor.isActive("italic")
          ? "bg-primary/10 text-primary"
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
        editor.isActive("underline")
          ? "bg-primary/10 text-primary"
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
        editor.isActive("strike")
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Strikethrough size={iconSize} />
    </button>
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
        editor.isActive({ textAlign: 'left' })
          ? "bg-primary/10 text-primary"
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
        editor.isActive({ textAlign: 'center' })
          ? "bg-primary/10 text-primary"
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
        editor.isActive({ textAlign: 'right' })
          ? "bg-primary/10 text-primary"
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
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setCodeBlock().run())}
          >
            <Code2 size={14} /> 코드 블록
          </button>
          {/if}
          {#if has('pdf')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => runInsert(onPdfClick)}
          >
            <FileText size={14} /> PDF
          </button>
          {/if}
          {#if has('file') && onFileClick}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => runInsert(onFileClick!)}
          >
            <Paperclip size={14} /> 파일 첨부
          </button>
          {/if}
          {#if has('table')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
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

          {#if has('horizontal-rule') || has('columns-2') || has('columns-3')}
          <div class="h-px bg-border my-1"></div>
          {/if}
          {#if has('horizontal-rule')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
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
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setColumns(2).run())}
          >
            <Columns2 size={14} /> 2단 컬럼
          </button>
          {/if}
          {#if has('columns-3')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runInsert(() => editor.chain().focus().setColumns(3).run())}
          >
            <Columns3 size={14} /> 3단 컬럼
          </button>
          {/if}

          {#if has('image') || has('link') || has('mbus')}
          <div class="h-px bg-border my-1"></div>
          {/if}
          {#if has('image')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={addImage}
          >
            <ImageIcon size={14} /> 이미지
          </button>
          {/if}
          {#if has('link')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={addLink}
          >
            <LinkIcon size={14} /> 링크
          </button>
          {/if}
          {#if has('mbus')}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
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
      defaultValue={editor.isActive("link") ? editor.getAttributes("link").href || "" : ""}
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
