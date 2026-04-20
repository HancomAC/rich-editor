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
    Video,
    ChevronRight,
    Paperclip,
    Film,
    Columns2,
    Columns3,
  } from "lucide-svelte";
  import type { SlashMenuItem, ToolbarFeature, PromptHandler } from "../types";
  import type { Component } from "svelte";

  const SI = 14;

  /** 각 feature가 속하는 섹션 라벨 */
  const SECTION_MAP: Record<string, string> = {
    h1: "기본",
    h2: "기본",
    h3: "기본",
    "bullet-list": "리스트",
    "ordered-list": "리스트",
    checklist: "리스트",
    toggle: "리스트",
    blockquote: "블록",
    "horizontal-rule": "블록",
    "code-block": "블록",
    table: "레이아웃",
    "columns-2": "레이아웃",
    "columns-3": "레이아웃",
    link: "미디어",
    image: "미디어",
    youtube: "미디어",
    pdf: "미디어",
    video: "미디어",
    file: "미디어",
  };
  const SECTION_ORDER = ["기본", "리스트", "블록", "레이아웃", "미디어"];

  const SLASH_MENU_ITEMS_DATA: {
    feature: ToolbarFeature;
    label: string;
    keywords: string;
    icon: Component<{ size?: number }>;
    command: (editor: Editor) => void;
  }[] = [
    {
      feature: "h1",
      label: "제목 1",
      keywords: "heading h1 제목",
      icon: Heading1,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      feature: "h2",
      label: "제목 2",
      keywords: "heading h2 제목",
      icon: Heading2,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      feature: "h3",
      label: "제목 3",
      keywords: "heading h3 제목",
      icon: Heading3,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      feature: "bullet-list",
      label: "글머리 목록",
      keywords: "bullet list 목록 리스트",
      icon: List,
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      feature: "ordered-list",
      label: "번호 목록",
      keywords: "ordered number list 번호 리스트",
      icon: ListOrdered,
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      feature: "checklist",
      label: "체크리스트",
      keywords: "checklist task todo 체크 할일",
      icon: CheckSquare,
      command: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      feature: "blockquote",
      label: "인용문",
      keywords: "quote blockquote 인용",
      icon: Quote,
      command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      feature: "horizontal-rule",
      label: "구분선",
      keywords: "divider hr horizontal rule 구분",
      icon: Minus,
      command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      feature: "code-block",
      label: "C++ 코드",
      keywords: "code cpp c++ 코드 블록",
      icon: Code2,
      command: (editor) =>
        editor.chain().focus().setCodeBlock({ language: "cpp" }).run(),
    },
    {
      feature: "code-block",
      label: "Python 코드",
      keywords: "code python 파이썬 코드 블록",
      icon: Code2,
      command: (editor) =>
        editor.chain().focus().setCodeBlock({ language: "python" }).run(),
    },
    {
      feature: "toggle",
      label: "토글",
      keywords: "toggle details 접기 펼치기 토글",
      icon: ChevronRight,
      command: (editor) => editor.chain().focus().setDetails().run(),
    },
    {
      feature: "table",
      label: "표",
      keywords: "table 표 테이블",
      icon: TableIcon,
      command: (editor) =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      feature: "columns-2",
      label: "2단 컬럼",
      keywords: "column 컬럼 2단 분할",
      icon: Columns2,
      command: (editor) => editor.chain().focus().setColumns(2).run(),
    },
    {
      feature: "columns-3",
      label: "3단 컬럼",
      keywords: "column 컬럼 3단 분할",
      icon: Columns3,
      command: (editor) => editor.chain().focus().setColumns(3).run(),
    },
    {
      feature: "youtube",
      label: "YouTube 영상",
      keywords: "youtube video 영상 동영상 유튜브",
      icon: Video,
      command: (editor) => {
        const url = window.prompt("YouTube URL을 입력하세요");
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
      },
    },
    {
      feature: "image",
      label: "이미지",
      keywords: "image 이미지 사진 img",
      icon: ImageIcon,
      command: (editor) => {
        const url = window.prompt("이미지 URL을 입력하세요");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
    },
    {
      feature: "link",
      label: "링크",
      keywords: "link url 링크 하이퍼",
      icon: LinkIcon,
      command: (editor) => {
        const url = window.prompt("링크 URL을 입력하세요");
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
    onVideoUpload,
    onPromptLink,
    onPromptImage,
  }: {
    editor: Editor;
    features: Set<ToolbarFeature>;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
    onFileUpload?: () => void;
    onVideoUpload?: () => void;
    onPromptLink?: PromptHandler;
    onPromptImage?: PromptHandler;
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
    if (item.feature === "image" && onPromptImage) {
      const url = await onPromptImage("");
      if (url) editor.chain().focus().setImage({ src: url }).run();
      return;
    }
    item.command(editor);
  }

  let selectedIndex = $state(0);
  let menuEl: HTMLDivElement | undefined = $state();
  let mouseMovedSinceKeyboard = $state(true);

  const allItems = $derived.by(() => {
    const items = SLASH_MENU_ITEMS_DATA.filter((item) => features.has(item.feature));
    if (onPdfUpload) {
      items.push({
        feature: "pdf" as ToolbarFeature,
        label: "PDF 파일",
        keywords: "pdf 파일 문서",
        icon: FileText,
        command: () => onPdfUpload!(),
      });
    }
    if (onVideoUpload) {
      items.push({
        feature: "video" as ToolbarFeature,
        label: "영상 파일",
        keywords: "video 영상 동영상 비디오 메타버스",
        icon: Film,
        command: () => onVideoUpload!(),
      });
    }
    if (onFileUpload) {
      items.push({
        feature: "file" as ToolbarFeature,
        label: "파일 첨부",
        keywords: "file attach 파일 첨부",
        icon: Paperclip,
        command: () => onFileUpload!(),
      });
    }
    return items;
  });

  const filtered = $derived.by(() => {
    const q = query.toLowerCase();
    return q
      ? allItems.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
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
    <p class="text-xs text-muted-foreground px-2 py-1">결과 없음</p>
  </div>
{:else}
  <div
    bind:this={menuEl}
    class="slash-menu z-50 bg-popover border border-border rounded-xl shadow-xl overflow-y-auto py-1.5"
  >
    {#each SECTION_ORDER as section}
      {@const sectionItems = filtered.filter(
        (it) => (SECTION_MAP[it.feature] ?? '기본') === section,
      )}
      {#if sectionItems.length > 0}
        <p class="slash-section">{section}</p>
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
            <span class="slash-label">{item.label}</span>
          </button>
        {/each}
      {/if}
    {/each}
  </div>
{/if}

<style>
  .slash-menu {
    width: 220px;
    max-height: 320px;
  }

  .slash-section {
    margin: 0;
    padding: 6px 12px 4px;
    font-size: var(--text-xs, 11px);
    font-weight: 600;
    color: var(--muted-foreground);
    letter-spacing: 0.02em;
  }
  .slash-section:not(:first-of-type) {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .slash-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 12px;
    text-align: left;
    font-size: var(--text-sm, 13px);
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
    top: 4px;
    bottom: 4px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background: var(--primary);
  }

  .slash-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
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
</style>
