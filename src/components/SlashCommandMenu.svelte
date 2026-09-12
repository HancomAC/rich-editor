<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Minus,
    Code2,
    ImageIcon,
    LinkIcon,
    Table as TableIcon,
    FileText,
    ChevronRight,
    Paperclip,
    Columns2,
    Columns3,
    PanelTop,
    Type,
    Tv,
    Youtube,
    SquareDashed,
    Sigma,
  } from "lucide-svelte";
  import ToggleHeading1 from "./icons/ToggleHeading1.svelte";
  import ToggleHeading2 from "./icons/ToggleHeading2.svelte";
  import ToggleHeading3 from "./icons/ToggleHeading3.svelte";
  import { insertTableSized } from "../utils/table";
  import type { SlashMenuItem, ToolbarFeature, PromptHandler } from "../types";
  import type { Component } from "svelte";
  import { defaultTranslator, type EditorMessageKey, type EditorTranslator } from "../i18n";

  const SI = 14;

  /** 각 feature가 속하는 섹션(메시지 키 — 라벨은 렌더 시 `t()` 로 푼다) */
  const SECTION_MAP: Record<string, EditorMessageKey> = {
    "code-block": "sectionFrequent",
    math: "sectionFrequent",
    file: "sectionMedia",
    pdf: "sectionMedia",
    paragraph: "sectionBasic",
    h1: "sectionBasic",
    h2: "sectionBasic",
    h3: "sectionBasic",
    mbus: "sectionMedia",
    video: "sectionMedia",
    card: "sectionBlock",
    "bullet-list": "sectionList",
    "ordered-list": "sectionList",
    checklist: "sectionList",
    toggle: "sectionList",
    blockquote: "sectionBlock",
    "horizontal-rule": "sectionBlock",
    table: "sectionLayout",
    "columns-2": "sectionLayout",
    "columns-3": "sectionLayout",
    tabs: "sectionLayout",
    link: "sectionMedia",
    image: "sectionMedia",
  };
  const SECTION_ORDER: EditorMessageKey[] = [
    "sectionFrequent",
    "sectionBasic",
    "sectionList",
    "sectionBlock",
    "sectionLayout",
    "sectionMedia",
  ];

  const SLASH_MENU_ITEMS_DATA: {
    feature: ToolbarFeature;
    labelKey: EditorMessageKey;
    keywords: string;
    icon: Component<{ size?: number }>;
    /** 항목 오른쪽에 작게 보여 줄 입력 규칙. 없으면 안 그린다. */
    shortcut?: string;
    /**
     * 이 항목이 들어갈 섹션. 없으면 `SECTION_MAP` 이 feature 로 정한다.
     * ⚠️ 토글 제목처럼 **같은 feature 인데 다른 자리**에 놓아야 하는 것 때문에 필요하다
     * (셋 다 `toggle` 이지만 토글은 리스트, 토글 제목은 제목 옆이 맞다).
     */
    /** `labelKey` 의 `{…}` 자리 값 (토글 제목 1~3 처럼 같은 키를 나눠 쓸 때). */
    labelParams?: Record<string, string | number>;
    section?: EditorMessageKey;
    command: (editor: Editor, t: EditorTranslator) => void;
  }[] = [
    {
      feature: "paragraph",
      labelKey: "paragraph",
      keywords: "paragraph text 본문 단락",
      icon: Type,
      command: (editor) => editor.chain().focus().setParagraph().run(),
    },
    {
      feature: "h1",
      labelKey: "heading1",
      keywords: "heading h1 제목",
      icon: Heading1,
      shortcut: "# ",
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      feature: "h2",
      labelKey: "heading2",
      keywords: "heading h2 제목",
      icon: Heading2,
      shortcut: "## ",
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      feature: "h3",
      labelKey: "heading3",
      keywords: "heading h3 제목",
      icon: Heading3,
      shortcut: "### ",
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      feature: "bullet-list",
      labelKey: "bulletList",
      keywords: "bullet list 목록 리스트",
      icon: List,
      shortcut: "- ",
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      feature: "ordered-list",
      labelKey: "orderedList",
      keywords: "ordered number list 번호 리스트",
      icon: ListOrdered,
      shortcut: "1. ",
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      feature: "checklist",
      labelKey: "taskList",
      keywords: "checklist task todo 체크 할일",
      icon: CheckSquare,
      shortcut: "[] ",
      command: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      feature: "blockquote",
      labelKey: "blockquote",
      keywords: "quote blockquote 인용",
      icon: Quote,
      shortcut: "\" ",
      command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      feature: "horizontal-rule",
      labelKey: "divider",
      keywords: "divider hr horizontal rule 구분",
      icon: Minus,
      shortcut: "---",
      command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      feature: "code-block",
      labelKey: "code",
      keywords: "code 코드 블록 cpp c++ python 파이썬",
      icon: Code2,
      shortcut: "```",
      command: (editor) =>
        editor.chain().focus().setCodeBlock().run(),
    },
    {
      feature: "math",
      labelKey: "math",
      keywords: "math latex tex 수식 공식 수학 katex 시그마 분수",
      icon: Sigma,
      shortcut: "$$",
      // 슬래시 메뉴는 `/수식` 을 지우면서 커맨드를 부른다. 프롬프트는 그 뒤에 열려야
      // 지운 자리에 결과가 들어간다 — `promptMathDisplay` 가 비동기라 순서가 맞는다.
      command: (editor) => editor.chain().focus().promptMathDisplay().run(),
    },
    {
      feature: "toggle",
      labelKey: "toggle",
      keywords: "toggle details 접기 펼치기 토글",
      icon: ChevronRight,
      shortcut: "> ",
      command: (editor) => editor.chain().focus().setToggleHeading(0).run(),
    },
    /*
     * 토글 제목 — 접히는 제목. 입력 규칙(`# > `)으로도 만들 수 있지만 그것만 있으면
     * **메뉴에는 없는 기능**이 된다(사용자 요청으로 추가).
     * 만드는 일은 입력 규칙과 **같은 커맨드**가 한다(`setToggleHeading`).
     *
     * ⚠️ 아이콘은 `제목 N` 과 **달라야 한다.** 한동안 둘 다 lucide `HeadingN` 이라 메뉴에서
     * 구분이 안 됐다(사용자 지적) — 삼각형이 붙은 `ToggleHeadingN` 을 쓴다.
     */
    {
      feature: "toggle",
      labelKey: "toggleHeading",
      labelParams: { level: 1 },
      section: "sectionBasic",
      keywords: "toggle heading 접기 제목 토글제목 h1",
      icon: ToggleHeading1,
      shortcut: "# > ",
      command: (editor) => editor.chain().focus().setToggleHeading(1).run(),
    },
    {
      feature: "toggle",
      labelKey: "toggleHeading",
      labelParams: { level: 2 },
      section: "sectionBasic",
      keywords: "toggle heading 접기 제목 토글제목 h2",
      icon: ToggleHeading2,
      shortcut: "## > ",
      command: (editor) => editor.chain().focus().setToggleHeading(2).run(),
    },
    {
      feature: "toggle",
      labelKey: "toggleHeading",
      labelParams: { level: 3 },
      section: "sectionBasic",
      keywords: "toggle heading 접기 제목 토글제목 h3",
      icon: ToggleHeading3,
      shortcut: "### > ",
      command: (editor) => editor.chain().focus().setToggleHeading(3).run(),
    },
    {
      feature: "table",
      labelKey: "table",
      keywords: "table 표 테이블",
      icon: TableIcon,
      command: (editor) =>
        insertTableSized(editor, { rows: 3, cols: 3, withHeaderRow: true }),
    },
    {
      feature: "columns-2",
      labelKey: "columns2",
      keywords: "column 컬럼 2단 분할",
      icon: Columns2,
      command: (editor) => editor.chain().focus().setColumns(2).run(),
    },
    {
      feature: "columns-3",
      labelKey: "columns3",
      keywords: "column 컬럼 3단 분할",
      icon: Columns3,
      command: (editor) => editor.chain().focus().setColumns(3).run(),
    },
    {
      feature: "tabs",
      labelKey: "tabs",
      keywords: "tab tabs 탭 탭블록 전환 분할",
      icon: PanelTop,
      command: (editor) => editor.chain().focus().setTabs(3).run(),
    },
    {
      feature: "image",
      labelKey: "image",
      keywords: "image 이미지 사진 img",
      icon: ImageIcon,
      command: (editor, t) => {
        const url = window.prompt(t("promptImageUrl"));
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
    },
    {
      feature: "video",
      labelKey: "video",
      keywords: "video 영상 유튜브 youtube vimeo 동영상",
      icon: Youtube,
      command: (editor, t) => {
        // 붙여넣은 주소는 `setVideoEmbed` 가 임베드용으로 바꿔 준다.
        const url = window.prompt(t("promptVideoUrl"));
        if (url) editor.chain().focus().setVideoEmbed({ src: url }).run();
      },
    },
    {
      feature: "mbus",
      labelKey: "mbusVideo",
      keywords: "mbus video 미디버스 영상",
      icon: Tv,
      command: (editor, t) => {
        const url = window.prompt(t("promptMbusUrl"));
        if (url) editor.chain().focus().setMbusVideo({ src: url }).run();
      },
    },
    {
      feature: "card",
      labelKey: "card",
      keywords: "card 카드 상자 박스 강조 배경",
      icon: SquareDashed,
      command: (editor) => {
        editor.chain().focus().setCard().run();
      },
    },
    {
      feature: "link",
      labelKey: "link",
      keywords: "link url 링크 하이퍼",
      icon: LinkIcon,
      command: (editor, t) => {
        const url = window.prompt(t("promptLinkUrl"));
        if (url)
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
      },
    },
  ];

  let {
    editor,
    features,
    query,
    onClose,
    onPdfUpload,
    onFileUpload,
    onImagePick,
    onPromptLink,
    onPromptMbus,
    onPromptVideo,
    t = defaultTranslator,
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
    onFileUpload?: () => void;
    /**
     * 이미지 넣기 — 툴바의 `이미지` 와 **같은 모달**을 연다(에디터가 띄운다).
     * 없으면 아래 항목의 기본 동작(`window.prompt`)으로 떨어진다.
     */
    onImagePick?: () => void;
    onPromptLink?: PromptHandler;
    onPromptMbus?: PromptHandler;
    /**
     * 영상 URL 프롬프트. 없으면 아래 항목의 `window.prompt` 로 떨어지는데, 그건 브라우저
     * 기본 대화상자라 화면이 멈추고 앱과 모양이 따로 논다(사용자 지적).
     */
    onPromptVideo?: PromptHandler;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
  } = $props();

  async function runItem(item: (typeof SLASH_MENU_ITEMS_DATA)[number]) {
    if (item.feature === "link" && onPromptLink) {
      const url = await onPromptLink("");
      if (url)
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      return;
    }
    if (item.feature === "image" && onImagePick) {
      onImagePick();
      return;
    }
    if (item.feature === "video" && onPromptVideo) {
      const url = await onPromptVideo("");
      if (url) editor.chain().focus().setVideoEmbed({ src: url }).run();
      return;
    }
    if (item.feature === "mbus" && onPromptMbus) {
      const url = await onPromptMbus("");
      if (url) editor.chain().focus().setMbusVideo({ src: url }).run();
      return;
    }
    item.command(editor, t);
  }

  let selectedIndex = $state(0);
  let menuEl: HTMLDivElement | undefined = $state();
  let mouseMovedSinceKeyboard = $state(true);

  const allItems = $derived.by(() => {
    const items = SLASH_MENU_ITEMS_DATA.filter((item) => features.has(item.feature));
    if (onFileUpload) {
      items.push({
        feature: "file" as ToolbarFeature,
        labelKey: "fileAttach",
        keywords: "file attach 파일 첨부",
        icon: Paperclip,
        command: () => onFileUpload!(),
      });
    }
    if (onPdfUpload) {
      items.push({
        feature: "pdf" as ToolbarFeature,
        labelKey: "pdfFile",
        keywords: "pdf 파일 문서",
        icon: FileText,
        command: () => onPdfUpload!(),
      });
    }
    return items;
  });

  const filtered = $derived.by(() => {
    const q = query.toLowerCase();
    return q
      ? allItems.filter(
          (item) =>
            t(item.labelKey, item.labelParams).toLowerCase().includes(q) ||
            item.keywords.toLowerCase().includes(q),
        )
      : allItems;
  });

  $effect(() => {
    // Reset index when query changes
    query;
    selectedIndex = 0;
  });

  $effect(() => {
    // Scroll selected into view
    if (menuEl) {
      const el = menuEl.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  });

  $effect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  });

  $effect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        mouseMovedSinceKeyboard = false;
        selectedIndex = (selectedIndex + 1) % filtered.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filtered.length === 0) return;
        mouseMovedSinceKeyboard = false;
        selectedIndex =
          selectedIndex <= 0 ? filtered.length - 1 : selectedIndex - 1;
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          const item = filtered[selectedIndex];
          onClose();
          runItem(item);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  });
</script>

{#if filtered.length === 0}
  <div
    bind:this={menuEl}
    class="slash-menu z-50 bg-popover border border-border rounded-xl shadow-xl p-2"
  >
    <p class="text-xs text-muted-foreground px-2 py-1">{t('noResult')}</p>
  </div>
{:else}
  <div
    bind:this={menuEl}
    class="slash-menu z-50 bg-popover border border-border rounded-xl shadow-xl overflow-y-auto py-1.5"
  >
    {#each SECTION_ORDER as section}
      {@const sectionItems = filtered.filter(
        (it) => (it.section ?? SECTION_MAP[it.feature] ?? 'sectionBasic') === section,
      )}
      {#if sectionItems.length > 0}
        <p class="slash-section">{t(section)}</p>
        {#each sectionItems as item}
          {@const i = filtered.indexOf(item)}
          <button
            type="button"
            data-index={i}
            class="slash-item {i === selectedIndex ? 'is-selected' : ''}"
            onmousemove={() => {
              if (!mouseMovedSinceKeyboard) {
                mouseMovedSinceKeyboard = true;
                return;
              }
              selectedIndex = i;
            }}
            onclick={() => {
              onClose();
              runItem(item);
            }}
          >
            <span class="slash-icon">
              <item.icon size={SI} />
            </span>
            <span class="slash-label">{t(item.labelKey, item.labelParams)}</span>
            {#if item.shortcut}
              <!--
                쳐서 만드는 법을 항목 옆에 적어 둔다(사용자 요청). 메뉴를 한 번 쓰고 나면
                다음부터는 메뉴를 안 열게 되는 게 목적이라, 눈에 띄되 이름을 가리지 않을
                만큼만 흐리게 둔다.
              -->
              <span class="slash-shortcut">{item.shortcut}</span>
            {/if}
          </button>
        {/each}
      {/if}
    {/each}
  </div>
{/if}

<style>
  .slash-menu {
    /* 단축키 표시가 오른쪽에 붙으면서 200px 로는 이름이 잘렸다. */
    width: 244px;
    max-height: 280px;
  }

  .slash-section {
    margin: 0;
    padding: 4px 10px 2px;
    font-size: 10px;
    font-weight: 600;
    color: var(--muted-foreground);
    letter-spacing: 0.02em;
  }
  .slash-section:not(:first-of-type) {
    margin-top: 2px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }

  .slash-item {
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

  .slash-item:hover,
  .slash-item.is-selected {
    background: color-mix(in srgb, var(--primary) 8%, transparent);
    color: var(--primary);
  }

  .slash-item.is-selected::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3px;
    bottom: 3px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--primary);
  }

  .slash-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-md, 6px);
    background: var(--muted);
    color: var(--muted-foreground);
  }

  .slash-item.is-selected .slash-icon,
  .slash-item:hover .slash-icon {
    background: color-mix(in srgb, var(--primary) 14%, transparent);
    color: var(--primary);
  }

  .slash-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /*
   * 오른쪽 끝에 붙는 입력 규칙 표시.
   * ⚠️ `flex-shrink: 0` — 이름이 길어지면 이쪽이 먼저 찌그러져 `# >` 가 `#…` 이 된다.
   * 줄이는 쪽은 위 `.slash-label`(말줄임 처리가 되어 있다)이어야 한다.
   */
  .slash-shortcut {
    flex-shrink: 0;
    margin-left: auto;
    padding-left: 8px;
    font-size: 11px;
    font-weight: 400;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: var(--muted-foreground);
    opacity: 0.75;
    white-space: pre;
  }
</style>
