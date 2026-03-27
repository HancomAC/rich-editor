"use client";

import { BubbleMenu } from "@tiptap/react/menus";
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
  Type,
} from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "../utils/cn";

function BubbleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-white/20 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

function BubbleDivider() {
  return <div className="w-px h-5 bg-white/20 mx-0.5" />;
}

interface BubbleToolbarProps {
  editor: Editor;
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const [showHeadings, setShowHeadings] = useState(false);
  const iconSize = 14;

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

  const getCurrentBlockLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "제목 1";
    if (editor.isActive("heading", { level: 2 })) return "제목 2";
    if (editor.isActive("heading", { level: 3 })) return "제목 3";
    return "본문";
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
      }}
      shouldShow={({ editor: e, state }) => {
        const { from, to } = state.selection;
        if (from === to) return false;
        if (e.isActive("codeBlock")) return false;
        if (e.isActive("image")) return false;
        return true;
      }}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1 bg-foreground rounded-lg shadow-xl">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHeadings(!showHeadings)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Type size={12} />
            {getCurrentBlockLabel()}
          </button>
          {showHeadings && (
            <div className="absolute bottom-full left-0 mb-1 bg-foreground rounded-lg shadow-xl border border-white/10 py-1 min-w-[120px]">
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  !editor.isActive("heading")
                    ? "text-white bg-white/10"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setShowHeadings(false);
                }}
              >
                <Type size={12} /> 본문
              </button>
              {[1, 2, 3].map((level) => {
                const Icon = level === 1 ? Heading1 : level === 2 ? Heading2 : Heading3;
                return (
                  <button
                    key={level}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                      editor.isActive("heading", { level })
                        ? "text-white bg-white/10"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .toggleHeading({ level: level as 1 | 2 | 3 })
                        .run();
                      setShowHeadings(false);
                    }}
                  >
                    <Icon size={12} /> 제목 {level}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <BubbleDivider />

        <BubbleButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="굵게"
        >
          <Bold size={iconSize} />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="기울임"
        >
          <Italic size={iconSize} />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="밑줄"
        >
          <UnderlineIcon size={iconSize} />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="취소선"
        >
          <Strikethrough size={iconSize} />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="하이라이트"
        >
          <Highlighter size={iconSize} />
        </BubbleButton>

        <BubbleDivider />

        <BubbleButton
          onClick={addLink}
          active={editor.isActive("link")}
          title="링크"
        >
          <LinkIcon size={iconSize} />
        </BubbleButton>

        <BubbleDivider />

        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="왼쪽 정렬"
        >
          <AlignLeft size={iconSize} />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="가운데 정렬"
        >
          <AlignCenter size={iconSize} />
        </BubbleButton>
        <BubbleButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="오른쪽 정렬"
        >
          <AlignRight size={iconSize} />
        </BubbleButton>
      </div>
    </BubbleMenu>
  );
}
