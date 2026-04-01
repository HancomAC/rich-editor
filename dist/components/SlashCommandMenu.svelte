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
    Youtube,
    ChevronRight,
  } from "lucide-svelte";
  import type { SlashMenuItem } from "../types";
  import type { Component } from "svelte";

  const SI = 14;

  const SLASH_MENU_ITEMS_DATA: {
    label: string;
    keywords: string;
    icon: Component<{ size?: number }>;
    command: (editor: Editor) => void;
  }[] = [
    {
      label: "제목 1",
      keywords: "heading h1 제목",
      icon: Heading1,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "제목 2",
      keywords: "heading h2 제목",
      icon: Heading2,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "제목 3",
      keywords: "heading h3 제목",
      icon: Heading3,
      command: (editor) =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "글머리 목록",
      keywords: "bullet list 목록 리스트",
      icon: List,
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "번호 목록",
      keywords: "ordered number list 번호 리스트",
      icon: ListOrdered,
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "체크리스트",
      keywords: "checklist task todo 체크 할일",
      icon: CheckSquare,
      command: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "인용문",
      keywords: "quote blockquote 인용",
      icon: Quote,
      command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "구분선",
      keywords: "divider hr horizontal rule 구분",
      icon: Minus,
      command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      label: "C++ 코드",
      keywords: "code cpp c++ 코드 블록",
      icon: Code2,
      command: (editor) =>
        editor.chain().focus().setCodeBlock({ language: "cpp" }).run(),
    },
    {
      label: "Python 코드",
      keywords: "code python 파이썬 코드 블록",
      icon: Code2,
      command: (editor) =>
        editor.chain().focus().setCodeBlock({ language: "python" }).run(),
    },
    {
      label: "토글",
      keywords: "toggle details 접기 펼치기 토글",
      icon: ChevronRight,
      command: (editor) => editor.chain().focus().setDetails().run(),
    },
    {
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
      label: "YouTube 영상",
      keywords: "youtube video 영상 동영상 유튜브",
      icon: Youtube,
      command: (editor) => {
        const url = window.prompt("YouTube URL을 입력하세요");
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
      },
    },
    {
      label: "이미지",
      keywords: "image 이미지 사진 img",
      icon: ImageIcon,
      command: (editor) => {
        const url = window.prompt("이미지 URL을 입력하세요");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
    },
    {
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
    query,
    onClose,
    onPdfUpload,
  }: {
    editor: Editor;
    query: string;
    onClose: () => void;
    onPdfUpload?: () => void;
  } = $props();

  let selectedIndex = $state(0);
  let menuEl: HTMLDivElement | undefined = $state();

  const allItems = $derived(
    onPdfUpload
      ? [
          ...SLASH_MENU_ITEMS_DATA,
          {
            label: "PDF 파일",
            keywords: "pdf 파일 문서",
            icon: FileText,
            command: () => onPdfUpload!(),
          },
        ]
      : SLASH_MENU_ITEMS_DATA,
  );

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
        selectedIndex = (selectedIndex + 1) % filtered.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex =
          selectedIndex <= 0 ? filtered.length - 1 : selectedIndex - 1;
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onClose();
          filtered[selectedIndex].command(editor);
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
    class="z-50 bg-popover border border-border rounded-lg shadow-lg p-2"
    style="width: 180px"
  >
    <p class="text-xs text-muted-foreground px-2 py-1">결과 없음</p>
  </div>
{:else}
  <div
    bind:this={menuEl}
    class="z-50 bg-popover border border-border rounded-lg shadow-lg overflow-y-auto py-1"
    style="width: 180px; max-height: 200px"
  >
    <p
      class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1.5"
    >
      블록
    </p>
    {#each filtered as item, i}
      <button
        type="button"
        data-index={i}
        class="w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded-md mx-0 {i ===
        selectedIndex
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted text-foreground'}"
        onmouseenter={() => (selectedIndex = i)}
        onclick={() => {
          onClose();
          item.command(editor);
        }}
      >
        <span
          class="flex items-center justify-center w-6 h-6 rounded border border-border bg-background text-muted-foreground shrink-0"
        >
          <item.icon size={SI} />
        </span>
        <span class="text-sm font-medium">{item.label}</span>
      </button>
    {/each}
  </div>
{/if}
