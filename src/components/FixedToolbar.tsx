"use client";

import type { Editor } from "@tiptap/react";
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
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

function Btn({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-30 pointer-events-none"
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-6 bg-border mx-0.5" />;
}

function TableMenuButton({
  onClick,
  icon,
  label,
  destructive,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "hover:bg-muted",
        disabled && "opacity-30 pointer-events-none"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

interface FixedToolbarProps {
  editor: Editor;
  onPdfClick: () => void;
}

export function FixedToolbar({ editor, onPdfClick }: FixedToolbarProps) {
  const iconSize = 16;

  const [codeMenuOpen, setCodeMenuOpen] = useState(false);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const codeMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (codeMenuRef.current && !codeMenuRef.current.contains(e.target as Node))
        setCodeMenuOpen(false);
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node))
        setTableMenuOpen(false);
    }
    if (codeMenuOpen || tableMenuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [codeMenuOpen, tableMenuOpen]);

  const addLink = useCallback(() => {
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
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("이미지 URL을 입력하세요");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const isInTable = editor.isActive("table");

  const runTableCommand = useCallback(
    (command: () => boolean) => {
      command();
      setTableMenuOpen(false);
    },
    []
  );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30 backdrop-blur-sm rounded-t-xl">
      {/* 서식 */}
      <Btn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="굵게"
      >
        <Bold size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="기울임"
      >
        <Italic size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="밑줄"
      >
        <UnderlineIcon size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="취소선"
      >
        <Strikethrough size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="하이라이트"
      >
        <Highlighter size={iconSize} />
      </Btn>

      <Sep />

      {/* 정렬 */}
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="왼쪽 정렬"
      >
        <AlignLeft size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="가운데 정렬"
      >
        <AlignCenter size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="오른쪽 정렬"
      >
        <AlignRight size={iconSize} />
      </Btn>

      <Sep />

      {/* 제목 */}
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="제목 1"
      >
        <Heading1 size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="제목 2"
      >
        <Heading2 size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="제목 3"
      >
        <Heading3 size={iconSize} />
      </Btn>

      <Sep />

      {/* 목록 */}
      <Btn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="글머리 목록"
      >
        <List size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="번호 목록"
      >
        <ListOrdered size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="인용문"
      >
        <Quote size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        <Minus size={iconSize} />
      </Btn>

      <Sep />

      {/* 미디어 */}
      <Btn onClick={addLink} active={editor.isActive("link")} title="링크">
        <LinkIcon size={iconSize} />
      </Btn>
      <Btn onClick={addImage} title="이미지">
        <ImageIcon size={iconSize} />
      </Btn>
      <Btn onClick={onPdfClick} title="PDF 삽입">
        <FileText size={iconSize} />
      </Btn>

      {/* 표 */}
      <div ref={tableMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setTableMenuOpen((prev) => !prev)}
          title="표"
          className={cn(
            "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
            isInTable
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <TableIcon size={iconSize} />
          <ChevronDown size={12} />
        </button>
        {tableMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 min-w-[220px] py-1">
            {!isInTable ? (
              <>
                <TableMenuButton
                  icon={<TableIcon size={14} />}
                  label="표 삽입 (3x3)"
                  onClick={() =>
                    runTableCommand(() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    )
                  }
                />
                <TableMenuButton
                  icon={<PanelTop size={14} />}
                  label="헤더 포함 4x4"
                  onClick={() =>
                    runTableCommand(() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 4, cols: 4, withHeaderRow: true })
                        .run()
                    )
                  }
                />
              </>
            ) : (
              <>
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  구조
                </p>
                <TableMenuButton
                  icon={<Rows3 size={14} />}
                  label="행 위에 추가"
                  disabled={!editor.can().addRowBefore()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().addRowBefore().run())
                  }
                />
                <TableMenuButton
                  icon={<Rows3 size={14} />}
                  label="행 아래에 추가"
                  disabled={!editor.can().addRowAfter()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().addRowAfter().run())
                  }
                />
                <TableMenuButton
                  icon={<Columns3 size={14} />}
                  label="열 왼쪽에 추가"
                  disabled={!editor.can().addColumnBefore()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().addColumnBefore().run())
                  }
                />
                <TableMenuButton
                  icon={<Columns3 size={14} />}
                  label="열 오른쪽에 추가"
                  disabled={!editor.can().addColumnAfter()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().addColumnAfter().run())
                  }
                />
                <div className="h-px bg-border my-1" />
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  헤더 / 셀
                </p>
                <TableMenuButton
                  icon={<PanelTop size={14} />}
                  label="헤더 행 토글"
                  disabled={!editor.can().toggleHeaderRow()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().toggleHeaderRow().run())
                  }
                />
                <TableMenuButton
                  icon={<PanelLeft size={14} />}
                  label="헤더 열 토글"
                  disabled={!editor.can().toggleHeaderColumn()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().toggleHeaderColumn().run())
                  }
                />
                <TableMenuButton
                  icon={<Combine size={14} />}
                  label="셀 병합"
                  disabled={!editor.can().mergeCells()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().mergeCells().run())
                  }
                />
                <TableMenuButton
                  icon={<SplitSquareHorizontal size={14} />}
                  label="셀 분할"
                  disabled={!editor.can().splitCell()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().splitCell().run())
                  }
                />
                <div className="h-px bg-border my-1" />
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  삭제
                </p>
                <TableMenuButton
                  icon={<Rows3 size={14} />}
                  label="행 삭제"
                  destructive
                  disabled={!editor.can().deleteRow()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().deleteRow().run())
                  }
                />
                <TableMenuButton
                  icon={<Columns3 size={14} />}
                  label="열 삭제"
                  destructive
                  disabled={!editor.can().deleteColumn()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().deleteColumn().run())
                  }
                />
                <TableMenuButton
                  icon={<Trash2 size={14} />}
                  label="표 삭제"
                  destructive
                  disabled={!editor.can().deleteTable()}
                  onClick={() =>
                    runTableCommand(() => editor.chain().focus().deleteTable().run())
                  }
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* 코드 블록 */}
      <div ref={codeMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setCodeMenuOpen((prev) => !prev)}
          title="코드 블록"
          className={cn(
            "flex items-center gap-0.5 p-1.5 rounded-md transition-colors",
            editor.isActive("codeBlock")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Code2 size={iconSize} />
          <ChevronDown size={12} />
        </button>
        {codeMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 min-w-[120px] py-1">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => {
                editor.chain().focus().setCodeBlock({ language: "cpp" }).run();
                setCodeMenuOpen(false);
              }}
            >
              C++
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => {
                editor.chain().focus().setCodeBlock({ language: "python" }).run();
                setCodeMenuOpen(false);
              }}
            >
              Python
            </button>
            <div className="h-px bg-border my-1" />
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => {
                editor.chain().focus().setCodeBlock({ language: "" }).run();
                setCodeMenuOpen(false);
              }}
            >
              일반 코드
            </button>
          </div>
        )}
      </div>

      <Sep />

      {/* Undo / Redo */}
      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        title="실행 취소"
      >
        <Undo size={iconSize} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        title="다시 실행"
      >
        <Redo size={iconSize} />
      </Btn>
    </div>
  );
}
