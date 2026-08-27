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
    Sigma,
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
    if (isActive("heading", { level: 1 })) return "제목 1";
    if (isActive("heading", { level: 2 })) return "제목 2";
    if (isActive("heading", { level: 3 })) return "제목 3";
    if (isActive("bulletList")) return "글머리 목록";
    if (isActive("orderedList")) return "번호 목록";
    if (isActive("taskList")) return "체크리스트";
    if (isActive("blockquote")) return "인용문";
    return "본문";
  }

  function isParagraphActive(): boolean {
    return (
      !isActive("heading") &&
      !isActive("bulletList") &&
      !isActive("orderedList") &&
      !isActive("taskList") &&
      !isActive("blockquote")
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
      /*
       * ⚠️ `tippyOptions` 는 **TipTap 2 시절 이름이라 v3 에서는 통째로 무시된다.**
       * v3 의 BubbleMenu 는 tippy 가 아니라 floating-ui 기반이고, 받는 키가 `options`
       * (placement·offset·flip·shift·…)로 바뀌었다. 지금까지 이 블록은 아무 효과가 없었다.
       * 마침 v3 기본값이 `placement: "top"` + `flip`·`shift` 활성이라 화면상 차이는 없었지만,
       * 죽은 설정을 남겨 두면 "위치를 지정해 뒀다"고 착각하게 된다.
       */
      options: {
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
  <div class="flex items-center gap-0.5 px-1.5 py-1 hce-menu-surface rounded-full shadow-xl">
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
            class="absolute bottom-full left-0 mb-1 hce-menu-surface rounded-lg shadow-xl border border-white/10 py-1"
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
                  ? "hce-active"
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
                    isActive("heading", { level })
                      ? "hce-active"
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
                  isActive("bulletList")
                    ? "hce-active"
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
                  isActive("orderedList")
                    ? "hce-active"
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
                  isActive("taskList")
                    ? "hce-active"
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
                  isActive("blockquote")
                    ? "hce-active"
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
        isActive("bold")
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
        isActive("italic")
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
          isActive("underline")
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
        isActive("strike")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Strikethrough size={iconSize} />
    </button>
    {/if}

    {#if has('math')}
    <!--
      버블 툴바는 **뭔가 선택돼 있을 때만** 뜨므로 여기서는 감싸기/풀기만 하면 된다
      (고정 툴바처럼 "빈 선택이면 새로 넣기" 로 떨어질 일이 없다).
      `minimal` 프리셋에는 고정 툴바가 없어서, 댓글에서 수식을 만드는 유일한 버튼이 이것이다.
    -->
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleMathInline().run()}
      title="인라인 수식"
      aria-label="인라인 수식"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        isActive("math_inline")
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10",
      )}
    >
      <Sigma size={iconSize} />
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
          isActive("highlight")
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
            class="absolute bottom-full left-0 mb-1 hce-menu-surface rounded-lg shadow-xl border border-white/10 p-2"
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
          isActive("link")
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10",
        )}
      >
        <LinkIcon size={iconSize} />
      </button>
    {/if}
  </div>
</div>
