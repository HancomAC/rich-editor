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
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Type,
  } from "lucide-svelte";
  import { cn } from "../utils/cn";

  let { editor }: { editor: Editor } = $props();

  let showHeadings = $state(false);
  let menuEl: HTMLDivElement | undefined = $state();
  const iconSize = 14;

  function getCurrentBlockLabel(): string {
    if (editor.isActive("heading", { level: 1 })) return "제목 1";
    if (editor.isActive("heading", { level: 2 })) return "제목 2";
    if (editor.isActive("heading", { level: 3 })) return "제목 3";
    return "본문";
  }

  function addLink() {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("링크 URL을 입력하세요", previousUrl);
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

    return () => {
      editor.unregisterPlugin(bubbleToolbarKey);
    };
  });
</script>

<div bind:this={menuEl} class="bubble-toolbar-container">
  <div class="flex items-center gap-0.5 px-1.5 py-1 bg-foreground rounded-lg shadow-xl">
    <!-- Block type selector -->
    <div class="relative">
      <button
        type="button"
        onclick={() => (showHeadings = !showHeadings)}
        class="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Type size={12} />
        {getCurrentBlockLabel()}
      </button>
      {#if showHeadings}
        <div
          class="absolute bottom-full left-0 mb-1 bg-foreground rounded-lg shadow-xl border border-white/10 py-1"
          style="min-width: 120px"
        >
          <button
            type="button"
            class={cn(
              "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
              !editor.isActive("heading")
                ? "text-white bg-white/10"
                : "text-white/70 hover:text-white hover:bg-white/10",
            )}
            onclick={() => {
              editor.chain().focus().setParagraph().run();
              showHeadings = false;
            }}
          >
            <Type size={12} /> 본문
          </button>
          {#each [1, 2, 3] as level}
            {@const Icon = level === 1 ? Heading1 : level === 2 ? Heading2 : Heading3}
            <button
              type="button"
              class={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                editor.isActive("heading", { level })
                  ? "text-white bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/10",
              )}
              onclick={() => {
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level as 1 | 2 | 3 })
                  .run();
                showHeadings = false;
              }}
            >
              <Icon size={12} /> 제목 {level}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="w-px h-5 bg-white/20 mx-0.5"></div>

    <!-- Format buttons -->
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleBold().run()}
      title="굵게"
      aria-label="굵게"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive("bold")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Bold size={iconSize} />
    </button>
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleItalic().run()}
      title="기울임"
      aria-label="기울임"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive("italic")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Italic size={iconSize} />
    </button>
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleUnderline().run()}
      title="밑줄"
      aria-label="밑줄"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive("underline")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <UnderlineIcon size={iconSize} />
    </button>
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleStrike().run()}
      title="취소선"
      aria-label="취소선"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive("strike")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Strikethrough size={iconSize} />
    </button>
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleHighlight().run()}
      title="하이라이트"
      aria-label="하이라이트"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive("highlight")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Highlighter size={iconSize} />
    </button>

    <div class="w-px h-5 bg-white/20 mx-0.5"></div>

    <button
      type="button"
      onclick={addLink}
      title="링크"
      aria-label="링크"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive("link")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <LinkIcon size={iconSize} />
    </button>

    <div class="w-px h-5 bg-white/20 mx-0.5"></div>

    <!-- Alignment -->
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign("left").run()}
      title="왼쪽 정렬"
      aria-label="왼쪽 정렬"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive({ textAlign: "left" })
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <AlignLeft size={iconSize} />
    </button>
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign("center").run()}
      title="가운데 정렬"
      aria-label="가운데 정렬"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive({ textAlign: "center" })
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <AlignCenter size={iconSize} />
    </button>
    <button
      type="button"
      onclick={() => editor.chain().focus().setTextAlign("right").run()}
      title="오른쪽 정렬"
      aria-label="오른쪽 정렬"
      class={cn(
        "p-1.5 rounded-md transition-colors",
        editor.isActive({ textAlign: "right" })
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <AlignRight size={iconSize} />
    </button>
  </div>
</div>
