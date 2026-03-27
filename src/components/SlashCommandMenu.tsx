"use client";

import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code2,
  ImageIcon,
  LinkIcon,
  Table as TableIcon,
  FileText,
} from "lucide-react";
import type { SlashMenuItem } from "../types";

const SI = 14;

export const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  {
    label: "제목 1",
    keywords: "heading h1 제목",
    icon: <Heading1 size={SI} />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "제목 2",
    keywords: "heading h2 제목",
    icon: <Heading2 size={SI} />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "제목 3",
    keywords: "heading h3 제목",
    icon: <Heading3 size={SI} />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "글머리 목록",
    keywords: "bullet list 목록 리스트",
    icon: <List size={SI} />,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "번호 목록",
    keywords: "ordered number list 번호 리스트",
    icon: <ListOrdered size={SI} />,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "인용문",
    keywords: "quote blockquote 인용",
    icon: <Quote size={SI} />,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "구분선",
    keywords: "divider hr horizontal rule 구분",
    icon: <Minus size={SI} />,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    label: "C++ 코드",
    keywords: "code cpp c++ 코드 블록",
    icon: <Code2 size={SI} />,
    command: (editor) =>
      editor.chain().focus().setCodeBlock({ language: "cpp" }).run(),
  },
  {
    label: "Python 코드",
    keywords: "code python 파이썬 코드 블록",
    icon: <Code2 size={SI} />,
    command: (editor) =>
      editor.chain().focus().setCodeBlock({ language: "python" }).run(),
  },
  {
    label: "표",
    keywords: "table 표 테이블",
    icon: <TableIcon size={SI} />,
    command: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    label: "이미지",
    keywords: "image 이미지 사진 img",
    icon: <ImageIcon size={SI} />,
    command: (editor) => {
      const url = window.prompt("이미지 URL을 입력하세요");
      if (url) editor.chain().focus().setImage({ src: url }).run();
    },
  },
  {
    label: "링크",
    keywords: "link url 링크 하이퍼",
    icon: <LinkIcon size={SI} />,
    command: (editor) => {
      const url = window.prompt("링크 URL을 입력하세요");
      if (url)
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  query: string;
  onClose: () => void;
  onPdfUpload?: () => void;
}

export function SlashCommandMenu({
  editor,
  query,
  onClose,
  onPdfUpload,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const allItems = onPdfUpload
    ? [
        ...SLASH_MENU_ITEMS,
        {
          label: "PDF 파일",
          keywords: "pdf 파일 문서",
          icon: <FileText size={SI} />,
          command: () => onPdfUpload(),
        },
      ]
    : SLASH_MENU_ITEMS;

  const q = query.toLowerCase();
  const filtered = q
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q)
      )
    : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? filtered.length - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].command(editor);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [filtered, selectedIndex, editor, onClose]);

  useEffect(() => {
    const el = menuRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        className="z-50 bg-popover border border-border rounded-lg shadow-lg p-2 w-56"
      >
        <p className="text-xs text-muted-foreground px-2 py-1">결과 없음</p>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="z-50 bg-popover border border-border rounded-lg shadow-lg w-56 max-h-72 overflow-y-auto py-1"
    >
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1.5">
        블록
      </p>
      {filtered.map((item, i) => (
        <button
          key={item.label}
          type="button"
          data-index={i}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-md mx-0 ${
            i === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted text-foreground"
          }`}
          onMouseEnter={() => setSelectedIndex(i)}
          onClick={() => {
            item.command(editor);
            onClose();
          }}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-background text-muted-foreground shrink-0">
            {item.icon}
          </span>
          <span className="text-sm font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
