<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
  import { PluginKey } from "@tiptap/pm/state";
  import { onMount } from "svelte";

  const bubbleToolbarKey = new PluginKey("bubbleToolbar");
  import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    LinkIcon,
    Heading1,
    Heading2,
    Heading3,
    Type,
    Palette,
    List,
    ListOrdered,
    ListChecks,
    Quote,
    ChevronDown,
  } from "lucide-svelte";
  import { cn } from "../utils/cn";
  import type { ToolbarFeature, PromptHandler } from "../types";

  let {
    editor,
    features,
    onPromptLink,
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    onPromptLink?: PromptHandler;
  } = $props();

  const has = (f: ToolbarFeature) => features.has(f);

  let showBlockMenu = $state(false);
  let showColors = $state(false);
  let menuEl: HTMLDivElement | undefined = $state();
  let blockMenuEl: HTMLDivElement | undefined = $state();
  let colorMenuEl: HTMLDivElement | undefined = $state();
  const iconSize = 14;

  const TEXT_COLORS = [
    { label: "기본", value: "" },
    { label: "검정", value: "#000000" },
    { label: "회색", value: "#6b7280" },
    { label: "빨강", value: "#dc2626" },
    { label: "주황", value: "#ea580c" },
    { label: "노랑", value: "#ca8a04" },
    { label: "초록", value: "#16a34a" },
    { label: "파랑", value: "#2563eb" },
    { label: "보라", value: "#7c3aed" }
  ];

  function getCurrentBlockLabel(): string {
    if (editor.isActive("heading", { level: 1 })) return "제목 1";
    if (editor.isActive("heading", { level: 2 })) return "제목 2";
    if (editor.isActive("heading", { level: 3 })) return "제목 3";
    if (editor.isActive("bulletList")) return "글머리 목록";
    if (editor.isActive("orderedList")) return "번호 목록";
    if (editor.isActive("taskList")) return "체크리스트";
    if (editor.isActive("blockquote")) return "인용문";
    return "본문";
  }

  function isParagraphActive(): boolean {
    return (
      !editor.isActive("heading") &&
      !editor.isActive("bulletList") &&
      !editor.isActive("orderedList") &&
      !editor.isActive("taskList") &&
      !editor.isActive("blockquote")
    );
  }

  async function addLink() {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = onPromptLink
      ? await onPromptLink(previousUrl)
      : window.prompt("링크 URL을 입력하세요", previousUrl);
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
  }

  function handleDocClick(e: MouseEvent) {
    const target = e.target as Node;
    if (showBlockMenu && blockMenuEl && !blockMenuEl.contains(target)) {
      showBlockMenu = false;
    }
    if (showColors && colorMenuEl && !colorMenuEl.contains(target)) {
      showColors = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      showBlockMenu = false;
      showColors = false;
    }
  }

  onMount(() => {
    if (!menuEl) return;

    const plugin = BubbleMenuPlugin({
      pluginKey: bubbleToolbarKey,
      editor,
      element: menuEl,
      shouldShow: ({ editor: e, state }) => {
        const { from, to } = state.selection;
        if (from === to) return false;
        if (e.isActive("codeBlock")) return false;
        if (e.isActive("image")) return false;
        return true;
      },
      tippyOptions: {
        placement: "top",
      },
    });

    editor.registerPlugin(plugin);
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      editor.unregisterPlugin(bubbleToolbarKey);
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  const hasBlockMenu = $derived(
    has('h1') ||
      has('h2') ||
      has('h3') ||
      has('bullet-list') ||
      has('ordered-list') ||
      has('checklist') ||
      has('blockquote'),
  );
</script>

<div bind:this={menuEl} class="bubble-toolbar-container" style="visibility: hidden">
  <div class="flex items-center gap-0.5 px-1.5 py-1 bg-foreground rounded-full shadow-xl">
    {#if hasBlockMenu}
      <!-- Block type selector -->
      <div class="relative" bind:this={blockMenuEl}>
        <button
          type="button"
          onclick={() => (showBlockMenu = !showBlockMenu)}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Type size={12} />
          {getCurrentBlockLabel()}
          <ChevronDown size={12} />
        </button>
        {#if showBlockMenu}
          <div
            class="absolute bottom-full left-0 mb-1 bg-foreground rounded-lg shadow-xl border border-white/10 py-1"
            style="min-width: 140px"
            onmousedown={(e) => e.preventDefault()}
            role="menu"
            tabindex="-1"
          >
            <button
              type="button"
              class={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                isParagraphActive()
                  ? "bg-primary/10 text-primary"
                  : "text-white/70 hover:text-white hover:bg-white/10",
              )}
              onclick={() => {
                editor.chain().focus().setParagraph().run();
                showBlockMenu = false;
              }}
            >
              <Type size={12} /> 본문
            </button>
            {#each [1, 2, 3] as level}
              {#if has(level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3')}
                {@const Icon = level === 1 ? Heading1 : level === 2 ? Heading2 : Heading3}
                <button
                  type="button"
                  class={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                    editor.isActive("heading", { level })
                      ? "bg-primary/10 text-primary"
                      : "text-white/70 hover:text-white hover:bg-white/10",
                  )}
                  onclick={() => {
                    editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: level as 1 | 2 | 3 })
                      .run();
                    showBlockMenu = false;
                  }}
                >
                  <Icon size={12} /> 제목 {level}
                </button>
              {/if}
            {/each}
            {#if has('bullet-list')}
              <button
                type="button"
                class={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  editor.isActive("bulletList")
                    ? "bg-primary/10 text-primary"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
                onclick={() => {
                  editor.chain().focus().toggleBulletList().run();
                  showBlockMenu = false;
                }}
              >
                <List size={12} /> 글머리 목록
              </button>
            {/if}
            {#if has('ordered-list')}
              <button
                type="button"
                class={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  editor.isActive("orderedList")
                    ? "bg-primary/10 text-primary"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
                onclick={() => {
                  editor.chain().focus().toggleOrderedList().run();
                  showBlockMenu = false;
                }}
              >
                <ListOrdered size={12} /> 번호 목록
              </button>
            {/if}
            {#if has('checklist')}
              <button
                type="button"
                class={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  editor.isActive("taskList")
                    ? "bg-primary/10 text-primary"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
                onclick={() => {
                  editor.chain().focus().toggleTaskList().run();
                  showBlockMenu = false;
                }}
              >
                <ListChecks size={12} /> 체크리스트
              </button>
            {/if}
            {#if has('blockquote')}
              <button
                type="button"
                class={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  editor.isActive("blockquote")
                    ? "bg-primary/10 text-primary"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
                onclick={() => {
                  editor.chain().focus().toggleBlockquote().run();
                  showBlockMenu = false;
                }}
              >
                <Quote size={12} /> 인용문
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <div class="w-px h-5 bg-white/20 mx-0.5"></div>
    {/if}

    <!-- Format buttons -->
    {#if has('bold')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleBold().run()}
      title="굵게"
      aria-label="굵게"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        editor.isActive("bold")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Bold size={iconSize} />
    </button>
    {/if}
    {#if has('italic')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleItalic().run()}
      title="기울임"
      aria-label="기울임"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        editor.isActive("italic")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Italic size={iconSize} />
    </button>
    {/if}
    {#if has('underline')}
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleUnderline().run()}
        title="밑줄"
        aria-label="밑줄"
        class={cn(
          "p-1.5 rounded-full transition-colors",
          editor.isActive("underline")
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10",
        )}
      >
        <UnderlineIcon size={iconSize} />
      </button>
    {/if}
    {#if has('strike')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleStrike().run()}
      title="취소선"
      aria-label="취소선"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        editor.isActive("strike")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Strikethrough size={iconSize} />
    </button>
    {/if}

    {#if has('highlight') || has('text-color')}
      <div class="w-px h-5 bg-white/20 mx-0.5"></div>
    {/if}

    {#if has('highlight')}
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleHighlight().run()}
        title="하이라이트"
        aria-label="하이라이트"
        class={cn(
          "p-1.5 rounded-full transition-colors",
          editor.isActive("highlight")
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10",
        )}
      >
        <Highlighter size={iconSize} />
      </button>
    {/if}
    {#if has('text-color')}
      <div class="relative" bind:this={colorMenuEl}>
        <button
          type="button"
          onclick={() => (showColors = !showColors)}
          title="글자색"
          aria-label="글자색"
          class={cn(
            "p-1.5 rounded-full transition-colors",
            editor.getAttributes("textStyle").color
              ? "bg-white/20 text-white"
              : "text-white/70 hover:text-white hover:bg-white/10",
          )}
        >
          <Palette size={iconSize} />
        </button>
        {#if showColors}
          <div
            class="absolute bottom-full left-0 mb-1 bg-foreground rounded-lg shadow-xl border border-white/10 p-2"
            style="min-width: 160px"
            onmousedown={(e) => e.preventDefault()}
            role="menu"
            tabindex="-1"
          >
            <div class="grid grid-cols-3 gap-1.5">
              {#each TEXT_COLORS as c}
                <button
                  type="button"
                  title={c.label}
                  class="h-7 rounded-md border border-white/20 transition-transform hover:scale-105 flex items-center justify-center text-xs font-bold"
                  style="color: {c.value || '#000'}; background: #fff"
                  onclick={() => {
                    if (c.value) {
                      editor.chain().focus().setColor(c.value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                    showColors = false;
                  }}
                >
                  {c.value ? "A" : "×"}
                </button>
              {/each}
            </div>
            <label
              class="hce-color-divider mt-2 pt-2 flex items-center justify-between gap-2 px-1 text-xs text-white/70 cursor-pointer hover:text-white"
            >
              <span>직접 선택</span>
              <input
                type="color"
                class="h-6 w-10 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                value={(editor.getAttributes("textStyle").color as string) || "#000000"}
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

    {#if has('link')}
      <div class="w-px h-5 bg-white/20 mx-0.5"></div>
      <button
        type="button"
        onclick={addLink}
        title="링크"
        aria-label="링크"
        class={cn(
          "p-1.5 rounded-full transition-colors",
          editor.isActive("link")
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10",
        )}
      >
        <LinkIcon size={iconSize} />
      </button>
    {/if}
  </div>
</div>
