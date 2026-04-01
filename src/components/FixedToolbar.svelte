<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    LinkIcon,
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
    Rows3,
    Columns3,
    Trash2,
    SplitSquareHorizontal,
    Combine,
    PanelTop,
    PanelLeft,
    Paintbrush,
    CheckSquare,
    Superscript,
    Subscript,
    Youtube,
    ChevronRight,
  } from "lucide-svelte";
  import { cn } from "../utils/cn";
  import InputModal from "./InputModal.svelte";

  let { editor, onPdfClick }: { editor: Editor; onPdfClick: () => void } =
    $props();

  const iconSize = 16;

  let codeMenuOpen = $state(false);
  let tableMenuOpen = $state(false);
  let modalState: { type: "link" | "image" | "cellBg" } | null = $state(null);
  let codeMenuEl: HTMLDivElement | undefined = $state();
  let tableMenuEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!codeMenuOpen && !tableMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (codeMenuEl && !codeMenuEl.contains(e.target as Node))
        codeMenuOpen = false;
      if (tableMenuEl && !tableMenuEl.contains(e.target as Node))
        tableMenuOpen = false;
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  });

  function addLink() {
    modalState = { type: "link" };
  }

  function addImage() {
    modalState = { type: "image" };
  }

  function runTableCommand(command: () => boolean) {
    command();
    tableMenuOpen = false;
  }

  const isInTable = $derived(editor.isActive("table"));

  const CELL_COLORS = [
    { label: "없음", value: "" },
    { label: "밝은 회색", value: "#f1f5f9" },
    { label: "밝은 파랑", value: "#dbeafe" },
    { label: "밝은 초록", value: "#dcfce7" },
    { label: "밝은 노랑", value: "#fef9c3" },
    { label: "밝은 주황", value: "#ffedd5" },
    { label: "밝은 빨강", value: "#fee2e2" },
    { label: "밝은 보라", value: "#ede9fe" },
    { label: "밝은 분홍", value: "#fce7f3" },
  ];
</script>

<div
  class="sticky top-[74px] z-10 flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-background rounded-t-xl"
  style="top: var(--header-height, 74px)"
>
  <!-- Format -->
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleBold().run()}
    title="굵게"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("bold")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Bold size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleItalic().run()}
    title="기울임"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("italic")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Italic size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleUnderline().run()}
    title="밑줄"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("underline")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <UnderlineIcon size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleStrike().run()}
    title="취소선"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("strike")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Strikethrough size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleHighlight().run()}
    title="하이라이트"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("highlight")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Highlighter size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleSuperscript().run()}
    title="위첨자"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("superscript")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Superscript size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleSubscript().run()}
    title="아래첨자"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("subscript")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Subscript size={iconSize} />
  </button>

  <div class="w-px h-6 bg-border mx-0.5"></div>

  <!-- Alignment -->
  <button
    type="button"
    onclick={() => editor.chain().focus().setTextAlign("left").run()}
    title="왼쪽 정렬"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive({ textAlign: "left" })
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <AlignLeft size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().setTextAlign("center").run()}
    title="가운데 정렬"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive({ textAlign: "center" })
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <AlignCenter size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().setTextAlign("right").run()}
    title="오른쪽 정렬"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive({ textAlign: "right" })
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <AlignRight size={iconSize} />
  </button>

  <div class="w-px h-6 bg-border mx-0.5"></div>

  <!-- Headings -->
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
    title="제목 1"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("heading", { level: 1 })
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Heading1 size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
    title="제목 2"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("heading", { level: 2 })
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Heading2 size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
    title="제목 3"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("heading", { level: 3 })
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Heading3 size={iconSize} />
  </button>

  <div class="w-px h-6 bg-border mx-0.5"></div>

  <!-- Lists -->
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleBulletList().run()}
    title="글머리 목록"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("bulletList")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <List size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleOrderedList().run()}
    title="번호 목록"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("orderedList")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <ListOrdered size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleTaskList().run()}
    title="체크리스트"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("taskList")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <CheckSquare size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().toggleBlockquote().run()}
    title="인용문"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("blockquote")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Quote size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().setHorizontalRule().run()}
    title="구분선"
    class="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
  >
    <Minus size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().setDetails().run()}
    title="토글 (접기/펼치기)"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("details")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <ChevronRight size={iconSize} />
  </button>

  <div class="w-px h-6 bg-border mx-0.5"></div>

  <!-- Media -->
  <button
    type="button"
    onclick={addLink}
    title="링크"
    class={cn(
      "p-1.5 rounded-md transition-colors",
      editor.isActive("link")
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <LinkIcon size={iconSize} />
  </button>
  <button
    type="button"
    onclick={addImage}
    title="이미지"
    class="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
  >
    <ImageIcon size={iconSize} />
  </button>
  <button
    type="button"
    onclick={onPdfClick}
    title="PDF 삽입"
    class="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
  >
    <FileText size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => {
      const url = window.prompt("YouTube URL을 입력하세요");
      if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }}
    title="YouTube 영상"
    class="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
  >
    <Youtube size={iconSize} />
  </button>

  <!-- Table menu -->
  <div bind:this={tableMenuEl} class="relative">
    <button
      type="button"
      onclick={() => (tableMenuOpen = !tableMenuOpen)}
      title="표"
      class={cn(
        "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
        isInTable
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <TableIcon size={iconSize} />
      <ChevronDown size={12} />
    </button>
    {#if tableMenuOpen}
      <div
        class="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 py-1"
        style="min-width: 220px"
      >
        {#if !isInTable}
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runTableCommand(() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
              )}
          >
            <TableIcon size={14} />
            표 삽입 (3x3)
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() =>
              runTableCommand(() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 4, cols: 4, withHeaderRow: true })
                  .run(),
              )}
          >
            <PanelTop size={14} />
            헤더 포함 4x4
          </button>
        {:else}
          <p
            class="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            구조
          </p>
          <button
            type="button"
            disabled={!editor.can().addRowBefore()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().addRowBefore() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().addRowBefore().run(),
              )}
          >
            <Rows3 size={14} /> 행 위에 추가
          </button>
          <button
            type="button"
            disabled={!editor.can().addRowAfter()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().addRowAfter() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().addRowAfter().run(),
              )}
          >
            <Rows3 size={14} /> 행 아래에 추가
          </button>
          <button
            type="button"
            disabled={!editor.can().addColumnBefore()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().addColumnBefore() &&
                "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().addColumnBefore().run(),
              )}
          >
            <Columns3 size={14} /> 열 왼쪽에 추가
          </button>
          <button
            type="button"
            disabled={!editor.can().addColumnAfter()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().addColumnAfter() &&
                "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().addColumnAfter().run(),
              )}
          >
            <Columns3 size={14} /> 열 오른쪽에 추가
          </button>
          <div class="h-px bg-border my-1"></div>
          <p
            class="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            헤더 / 셀
          </p>
          <button
            type="button"
            disabled={!editor.can().toggleHeaderRow()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().toggleHeaderRow() &&
                "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().toggleHeaderRow().run(),
              )}
          >
            <PanelTop size={14} /> 헤더 행 토글
          </button>
          <button
            type="button"
            disabled={!editor.can().toggleHeaderColumn()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().toggleHeaderColumn() &&
                "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().toggleHeaderColumn().run(),
              )}
          >
            <PanelLeft size={14} /> 헤더 열 토글
          </button>
          <button
            type="button"
            disabled={!editor.can().mergeCells()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().mergeCells() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().mergeCells().run(),
              )}
          >
            <Combine size={14} /> 셀 병합
          </button>
          <button
            type="button"
            disabled={!editor.can().splitCell()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted",
              !editor.can().splitCell() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().splitCell().run(),
              )}
          >
            <SplitSquareHorizontal size={14} /> 셀 분할
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-muted"
            onclick={() => {
              tableMenuOpen = false;
              modalState = { type: "cellBg" };
            }}
          >
            <Paintbrush size={14} /> 셀 배경색
          </button>
          <div class="h-px bg-border my-1"></div>
          <p
            class="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            삭제
          </p>
          <button
            type="button"
            disabled={!editor.can().deleteRow()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 text-destructive hover:bg-destructive/10",
              !editor.can().deleteRow() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().deleteRow().run(),
              )}
          >
            <Rows3 size={14} /> 행 삭제
          </button>
          <button
            type="button"
            disabled={!editor.can().deleteColumn()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 text-destructive hover:bg-destructive/10",
              !editor.can().deleteColumn() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().deleteColumn().run(),
              )}
          >
            <Columns3 size={14} /> 열 삭제
          </button>
          <button
            type="button"
            disabled={!editor.can().deleteTable()}
            class={cn(
              "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 text-destructive hover:bg-destructive/10",
              !editor.can().deleteTable() && "opacity-30 pointer-events-none",
            )}
            onclick={() =>
              runTableCommand(() =>
                editor.chain().focus().deleteTable().run(),
              )}
          >
            <Trash2 size={14} /> 표 삭제
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Code block menu -->
  <div bind:this={codeMenuEl} class="relative">
    <button
      type="button"
      onclick={() => (codeMenuOpen = !codeMenuOpen)}
      title="코드 블록"
      class={cn(
        "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
        editor.isActive("codeBlock")
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Code2 size={iconSize} />
      <ChevronDown size={12} />
    </button>
    {#if codeMenuOpen}
      <div
        class="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 py-1"
        style="min-width: 130px"
      >
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
          onclick={() => {
            editor.chain().focus().setCodeBlock({ language: "cpp" }).run();
            codeMenuOpen = false;
          }}
        >
          C++
        </button>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
          onclick={() => {
            editor.chain().focus().setCodeBlock({ language: "python" }).run();
            codeMenuOpen = false;
          }}
        >
          Python
        </button>
        <div class="h-px bg-border my-1"></div>
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
          onclick={() => {
            editor.chain().focus().setCodeBlock({ language: "" }).run();
            codeMenuOpen = false;
          }}
        >
          일반 코드
        </button>
      </div>
    {/if}
  </div>

  <div class="w-px h-6 bg-border mx-0.5"></div>

  <!-- Undo / Redo -->
  <button
    type="button"
    onclick={() => editor.chain().focus().undo().run()}
    disabled={!editor.can().undo()}
    title="실행 취소"
    class={cn(
      "p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
      !editor.can().undo() && "opacity-30 pointer-events-none",
    )}
  >
    <Undo size={iconSize} />
  </button>
  <button
    type="button"
    onclick={() => editor.chain().focus().redo().run()}
    disabled={!editor.can().redo()}
    title="다시 실행"
    class={cn(
      "p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground",
      !editor.can().redo() && "opacity-30 pointer-events-none",
    )}
  >
    <Redo size={iconSize} />
  </button>

  <!-- Modals -->
  {#if modalState?.type === "link"}
    <InputModal
      title="링크 URL 입력"
      placeholder="https://example.com"
      defaultValue={editor.getAttributes("link").href || ""}
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
  {#if modalState?.type === "cellBg"}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onclick={() => (modalState = null)}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="bg-popover border border-border rounded-xl shadow-lg p-4"
        style="min-width: 240px"
        onclick={(e) => e.stopPropagation()}
      >
        <p class="text-sm font-semibold mb-3">셀 배경색</p>
        <div class="grid grid-cols-3 gap-2">
          {#each CELL_COLORS as c}
            <button
              type="button"
              title={c.label}
              class="h-9 rounded-lg border border-border transition-transform hover:scale-105 flex items-center justify-center text-xs"
              style="background: {c.value ||
                '#fff'}; {!c.value
                ? 'background-image: linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)'
                : ''}"
              onclick={() => {
                editor
                  .chain()
                  .focus()
                  .setCellAttribute("backgroundColor", c.value || null)
                  .run();
                modalState = null;
              }}
            >
              {c.value ? "" : ""}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
