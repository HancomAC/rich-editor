"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import cpp from "highlight.js/lib/languages/cpp";
import python from "highlight.js/lib/languages/python";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { FixedDetails } from "../extensions/FixedDetails";
import Youtube from "@tiptap/extension-youtube";
import FileHandler from "@tiptap/extension-file-handler";
import "highlight.js/styles/atom-one-dark.css";

const cellAttrs = {
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
    renderHTML: (attributes: Record<string, unknown>) => {
      const styles: string[] = [];
      if (attributes.backgroundColor) styles.push(`background-color: ${attributes.backgroundColor}`);
      if (attributes.lineHeight) styles.push(`line-height: ${attributes.lineHeight}`);
      return styles.length ? { style: styles.join("; ") } : {};
    },
  },
  lineHeight: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
    renderHTML: () => ({}),
  },
};

const CustomTableCell = TableCell.extend({
  addAttributes() { return { ...this.parent?.(), ...cellAttrs }; },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() { return { ...this.parent?.(), ...cellAttrs }; },
});

import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEffect, useCallback, useState, useRef } from "react";

/**
 * 코드블록이 문서 맨 첫 노드일 때, 코드블록 맨 앞에서
 * ArrowUp을 누르면 위에 빈 paragraph를 삽입하고 커서 이동.
 * 표 등 다른 블록에는 적용하지 않음 (gapcursor가 처리).
 */
const CodeBlockTopEscape = Extension.create({
  name: "codeBlockTopEscape",
  addKeyboardShortcuts() {
    return {
      ArrowUp: () => {
        const { state, view } = this.editor;
        const { from } = state.selection;
        const firstNode = state.doc.firstChild;
        if (!firstNode) return false;
        if (firstNode.type.name !== "codeBlock") return false;
        // 커서가 코드블록 첫 줄에 있을 때만
        const codeStart = 1; // doc(0) > codeBlock content starts at 1
        if (from !== codeStart) return false;
        const tr = state.tr.insert(0, state.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, 1));
        view.dispatch(tr);
        return true;
      },
    };
  },
});
// FloatingMenu는 레이아웃 이슈로 현재 비활성화 — 슬래시(/) 명령으로 대체
import { PdfBlock } from "../extensions/PdfBlock";
import { Indent } from "../extensions/Indent";
import { FixedToolbar } from "./FixedToolbar";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { TableBubbleMenu } from "./TableBubbleMenu";
import type { UploadHandler } from "../types";

const lowlight = createLowlight(common);
lowlight.register("cpp", cpp);
lowlight.register("python", python);

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 파일 업로드 핸들러. File을 받아 업로드된 URL을 반환 */
  onUploadFile?: UploadHandler;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = "'/'를 눌러 명령어를 입력하세요...",
  onUploadFile,
}: TipTapEditorProps) {
  const [uploading, setUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "cpp",
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            const level = node.attrs.level;
            if (level === 1) return "제목 1";
            if (level === 2) return "제목 2";
            if (level === 3) return "제목 3";
          }
          return placeholder;
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      Image.configure({ inline: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Typography,
      CharacterCount,
      Table.configure({ resizable: true, allowTableNodeSelection: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      PdfBlock,
      CodeBlockTopEscape,
      Indent,
      FixedDetails,
      DetailsContent,
      DetailsSummary,
      Youtube.configure({ inline: false, allowFullscreen: true }),
      ...(onUploadFile
        ? [
            FileHandler.configure({
              allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
              onDrop: (_currentEditor, files, pos) => {
                for (const file of files) {
                  if (file.type.startsWith("image/")) {
                    setUploading(true);
                    onUploadFile(file)
                      .then((url) => {
                        _currentEditor
                          .chain()
                          .focus()
                          .insertContentAt(pos, { type: "image", attrs: { src: url } })
                          .run();
                      })
                      .catch(() => alert("이미지 업로드에 실패했습니다."))
                      .finally(() => setUploading(false));
                  }
                }
              },
              onPaste: (_currentEditor, files) => {
                for (const file of files) {
                  if (file.type.startsWith("image/")) {
                    setUploading(true);
                    onUploadFile(file)
                      .then((url) => {
                        _currentEditor.chain().focus().setImage({ src: url }).run();
                      })
                      .catch(() => alert("이미지 업로드에 실패했습니다."))
                      .finally(() => setUploading(false));
                  }
                }
              },
            }),
          ]
        : []),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
        .replace(/(<p><br\s*\/?><\/p>\s*)+$/, "")
        .replace(/<p><\/p>/g, "<p><br></p>");
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none p-4",
      },
      scrollThreshold: 100,
      scrollMargin: 100,
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
      editor.commands.fixTables();
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps


  // 테이블이 에디터를 넘으면 마지막 열을 줄여서 맞춤
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    const observer = new MutationObserver(() => {
      const wrapper = editorDom.closest(".hce-editor-wrapper");
      if (!wrapper) return;
      const maxW = wrapper.clientWidth - 32;
      wrapper.querySelectorAll("table").forEach((table) => {
        const cols = table.querySelectorAll("colgroup col");
        if (cols.length < 2) return;
        let total = 0;
        cols.forEach((col) => {
          total += parseInt((col as HTMLElement).style.width || "0", 10);
        });
        if (total > maxW) {
          const lastCol = cols[cols.length - 1] as HTMLElement;
          const lastW = parseInt(lastCol.style.width || "0", 10);
          const newW = lastW - (total - maxW);
          if (newW >= 40) lastCol.style.width = `${newW}px`;
        }
      });
    });
    observer.observe(editorDom, { subtree: true, attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [editor]);

  const uploadPdf = useCallback(
    (file: File) => {
      if (!editor || !onUploadFile) return;
      setUploading(true);

      onUploadFile(file)
        .then((url) => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "pdfBlock",
              attrs: { src: url, name: file.name },
            })
            .run();
        })
        .catch(() => {
          alert("PDF 업로드에 실패했습니다.");
        })
        .finally(() => {
          setUploading(false);
        });
    },
    [editor, onUploadFile]
  );

  // 슬래시 커맨드 상태
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [slashMenuDirection, setSlashMenuDirection] = useState<"down" | "up">("down");
  const [slashQuery, setSlashQuery] = useState("");
  const slashStartPos = useRef<number | null>(null);
  const MENU_HEIGHT = 210; // 메뉴 max-height(200) + 여유

  const updateSlashMenuPosition = useCallback(() => {
    if (!editor || slashStartPos.current === null) return;
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);

    // 상단/하단 고정 요소 높이 계산
    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--header-height") || "74"
    );
    const toolbarEl = editor.view.dom.closest(".hce-editor-wrapper")?.querySelector(".sticky");
    const toolbarBottom = toolbarEl ? toolbarEl.getBoundingClientRect().bottom : headerHeight;
    const topSafe = Math.max(toolbarBottom, headerHeight) + 4;

    // 하단 sticky 바 감지
    const bottomBar = document.querySelector(".sticky.bottom-0");
    const bottomBarHeight = bottomBar ? bottomBar.getBoundingClientRect().height : 0;
    const bottomSafe = window.innerHeight - bottomBarHeight - 4;

    // 사용 가능한 공간
    const spaceBelow = bottomSafe - coords.bottom;
    const spaceAbove = coords.top - topSafe;
    const goUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;

    let top: number;
    if (goUp) {
      top = Math.max(topSafe, coords.top - MENU_HEIGHT);
    } else {
      top = Math.min(coords.bottom + 4, bottomSafe - MENU_HEIGHT);
    }

    setSlashMenuDirection(goUp ? "up" : "down");
    setSlashMenuPos({ top, left: coords.left });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const $pos = state.doc.resolve(from);
      const lineStart = $pos.start();
      const lineText = state.doc.textBetween(lineStart, from, "\n");

      if (lineText.startsWith("/")) {
        if (slashStartPos.current === null) {
          slashStartPos.current = lineStart;
        }
        setSlashQuery(lineText.slice(1));
        setSlashMenuOpen(true);
        updateSlashMenuPosition();
      } else {
        if (slashMenuOpen) {
          setSlashMenuOpen(false);
          slashStartPos.current = null;
          setSlashQuery("");
        }
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", () => {
      if (slashMenuOpen) {
        const { state } = editor;
        const { from } = state.selection;
        const $pos = state.doc.resolve(from);
        const lineStart = $pos.start();
        const lineText = state.doc.textBetween(lineStart, from, "\n");
        if (!lineText.startsWith("/")) {
          setSlashMenuOpen(false);
          slashStartPos.current = null;
          setSlashQuery("");
        }
      }
    });

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, slashMenuOpen, updateSlashMenuPosition]);

  // 스크롤 시 메뉴 위치 재계산
  useEffect(() => {
    if (!slashMenuOpen) return;
    const onScroll = () => updateSlashMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [slashMenuOpen, updateSlashMenuPosition]);

  const deleteSlashText = useCallback(() => {
    if (!editor || slashStartPos.current === null) return;
    const { state } = editor;
    const { from } = state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: slashStartPos.current, to: from })
      .run();
  }, [editor]);

  const closeSlashMenu = useCallback(() => {
    deleteSlashText();
    setSlashMenuOpen(false);
    slashStartPos.current = null;
    setSlashQuery("");
  }, [deleteSlashText]);

  if (!editor) return null;

  return (
    <div className="hce-editor-wrapper relative border border-border rounded-xl bg-background">
      <FixedToolbar editor={editor} onPdfClick={() => pdfInputRef.current?.click()} />

      <EditorContent editor={editor} />
      <TableBubbleMenu editor={editor} />

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
          <p className="text-sm text-muted-foreground animate-pulse">
            업로드 중...
          </p>
        </div>
      )}

      {slashMenuOpen && (
        <div
          style={{ top: slashMenuPos.top, left: slashMenuPos.left }}
          className="fixed z-50"
        >
          <SlashCommandMenu
            editor={editor}
            query={slashQuery}
            onClose={closeSlashMenu}
            onPdfUpload={onUploadFile ? () => pdfInputRef.current?.click() : undefined}
          />
        </div>
      )}

      <div className="flex justify-end px-4 py-2 text-xs text-muted-foreground border-t border-border">
        {editor.storage.characterCount.characters()} 자 · {editor.storage.characterCount.words()} 단어
      </div>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadPdf(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
