<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
  import { PluginKey, NodeSelection } from "@tiptap/pm/state";
  import { CellSelection } from "@tiptap/pm/tables";
  import { onMount } from "svelte";

  const bubbleToolbarKey = new PluginKey("bubbleToolbar");
  import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Code,
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
        /*
         * ⚠️ **덩어리를 고른 것(NodeSelection)에는 뜨지 않는다.**
         *
         * 이미지·파일 첨부·PDF·카드 같은 노드를 클릭하면 `from !== to` 가 되어 "글자를
         * 골랐다"와 구별되지 않는다. 그러면 굵게·기울임처럼 **글자에만 걸리는 서식** 메뉴가
         * 그림 위에 떠서, 눌러도 아무 일이 없는 버튼만 보여 준다.
         *
         * 예전에는 `isActive("image")` 로 이미지 하나만 막았는데, 그건 노드가 늘 때마다
         * 빠뜨리게 되는 방식이다(실제로 파일 첨부에서 떴다). 종류를 세지 말고 **선택의
         * 종류**로 가른다.
         */
        if (state.selection instanceof NodeSelection) return false;
        /*
         * ⚠️ **셀을 고른 것(CellSelection)에도 뜨지 않는다.**
         *
         * 표에서 셀을 끌어 고르면 "글자를 골랐다"와 구별이 안 돼 서식 버블이 떴는데,
         * 그게 **표 메뉴의 병합·분할 버튼을 가렸다**(사용자 지적). 그 상태에서 손이 가는
         * 건 서식이 아니라 표 도구다.
         *
         * ⚠️ z 순서로 풀지 않는다 — 버블을 아래로 내리면 이번엔 셀 안에서 글자를 골랐을 때
         * 버블이 표 메뉴에 가린다(그게 원래 신고였다). **겹치는 상황 자체를 없애는** 쪽이 맞다.
         * 셀 하나 안에서 글자를 고르는 건 여전히 `TextSelection` 이라 버블이 정상으로 뜬다.
         */
        if (state.selection instanceof CellSelection) return false;
        if (e.isActive("codeBlock")) return false;
        return true;
      },
      /*
       * ⚠️ **기본값 250ms 는 눈에 띄게 느리다**(사용자 지적). 플러그인은 선택이 비어 있지
       * 않으면 **무조건** 이 디바운스를 태우므로(`update()` 의 `hasValidSelection` 분기),
       * 글자를 다 골라 놓고도 4분의 1초를 기다리게 된다.
       *
       * 그렇다고 `0` 으로 두면 드래그하는 **내내** 위치를 다시 잡아 버블이 따라다닌다.
       * 100ms 면 끌기가 끝난 직후로 느껴지면서 그 재계산은 여전히 묶인다.
       */
      updateDelay: 100,
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

  /*
   * 블록 타입 선택기는 **고정 툴바가 없을 때만** 버블에 넣는다.
   *
   * 고정 툴바(`full`·`standard`)에는 이미 같은 선택기가 늘 보이는 자리에 있어서, 버블에도
   * 넣으면 같은 것이 두 벌 뜨고 버블이 그만큼 길어진다. 글자를 끌어 골랐을 때 손이 가는 건
   * 대개 **서식**이지 블록 바꾸기가 아니다.
   *
   * `minimal`(댓글 등)에는 고정 툴바가 없어 버블이 유일한 메뉴이므로 그대로 남는다.
   */
  const hasBlockMenu = $derived(
    !has('fixed-toolbar') &&
      (has('h1') ||
        has('h2') ||
        has('h3') ||
        has('bullet-list') ||
        has('ordered-list') ||
        has('checklist') ||
        has('blockquote')),
  );
</script>

<div bind:this={menuEl} class="bubble-toolbar-container" style="visibility: hidden">
  <div class="flex items-center gap-0.5 px-1.5 py-1 rounded-full hce-floating-panel">
    {#if hasBlockMenu}
      <!-- Block type selector -->
      <div class="relative" bind:this={blockMenuEl}>
        <button
          type="button"
          onclick={() => (showBlockMenu = !showBlockMenu)}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Type size={12} />
          {getCurrentBlockLabel()}
          <ChevronDown size={12} />
        </button>
        {#if showBlockMenu}
          <div
            class="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl py-1"
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
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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

      <div class="w-px h-5 bg-border mx-0.5"></div>
    {/if}

    <!-- Format buttons -->
    {#if has('bold')}
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleBold().run()}
      aria-label="굵게"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        isActive("bold")
          ? "hce-active"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
        "p-1.5 rounded-full transition-colors",
        isActive("italic")
          ? "hce-active"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
          "p-1.5 rounded-full transition-colors",
          isActive("underline")
            ? "hce-active"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
        "p-1.5 rounded-full transition-colors",
        isActive("strike")
          ? "hce-active"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Strikethrough size={iconSize} />
    </button>
    {/if}

    {#if has('code')}
    <!-- 인라인 코드(`<code>`). 고정 툴바와 같은 자리(취소선 다음)에 둔다. -->
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleCode().run()}
      aria-label="코드"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        isActive("code")
          ? "hce-active"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Code size={iconSize} />
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
      aria-label="인라인 수식"
      class={cn(
        "p-1.5 rounded-full transition-colors",
        isActive("math_inline")
          ? "hce-active"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Sigma size={iconSize} />
    </button>
    {/if}

    {#if has('highlight') || has('text-color')}
      <div class="w-px h-5 bg-border mx-0.5"></div>
    {/if}

    {#if has('highlight')}
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleHighlight().run()}
        aria-label="하이라이트"
        class={cn(
          "p-1.5 rounded-full transition-colors",
          isActive("highlight")
            ? "hce-active"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
          aria-label="글자색"
          class={cn(
            "p-1.5 rounded-full transition-colors",
            editor.getAttributes("textStyle").color
              ? "hce-active"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Palette size={iconSize} />
        </button>
        {#if showColors}
          <div
            class="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl p-2"
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
                  class="h-7 rounded-md border border-border transition-transform hover:scale-105 flex items-center justify-center text-xs font-bold"
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
              class="hce-color-divider mt-2 pt-2 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            >
              <span>직접 선택</span>
              <input
                type="color"
                class="h-6 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
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
      <div class="w-px h-5 bg-border mx-0.5"></div>
      <button
        type="button"
        onclick={addLink}
        aria-label="링크"
        class={cn(
          "p-1.5 rounded-full transition-colors",
          isActive("link")
            ? "hce-active"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <LinkIcon size={iconSize} />
      </button>
    {/if}
  </div>
</div>
