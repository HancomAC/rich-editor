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
import "highlight.js/styles/atom-one-dark.css";

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.backgroundColor) return {};
          return { style: `background-color: ${attributes.backgroundColor}` };
        },
      },
    };
  },
});

import { useEffect, useCallback, useState, useRef } from "react";
import { PdfBlock } from "../extensions/PdfBlock";
import { FixedToolbar } from "./FixedToolbar";
import { BlockHandle } from "./BlockHandle";
import { SlashCommandMenu } from "./SlashCommandMenu";
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
      TableHeader,
      CustomTableCell,
      PdfBlock,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none min-h-[400px] py-6 pr-4",
      },
      handlePaste: (view, event) => {
        if (!onUploadFile) return false;

        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;

        const imageFile = Array.from(files).find((f) =>
          f.type.startsWith("image/")
        );
        if (!imageFile) return false;

        event.preventDefault();
        setUploading(true);

        onUploadFile(imageFile)
          .then((url) => {
            const { state, dispatch } = view;
            const node = state.schema.nodes.image.create({ src: url });
            const tr = state.tr.replaceSelectionWith(node);
            dispatch(tr);
          })
          .catch(() => {
            alert("이미지 업로드에 실패했습니다.");
          })
          .finally(() => {
            setUploading(false);
          });

        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
      editor.commands.fixTables();
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [slashQuery, setSlashQuery] = useState("");
  const slashStartPos = useRef<number | null>(null);

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
          const coords = editor.view.coordsAtPos(from);
          const editorRect = editor.view.dom
            .closest(".hce-editor-wrapper")
            ?.getBoundingClientRect();
          if (editorRect) {
            const menuHeight = 400;
            const spaceBelow = editorRect.bottom - coords.bottom;
            setSlashMenuPos({
              top:
                spaceBelow < menuHeight
                  ? coords.top - editorRect.top - menuHeight
                  : coords.bottom - editorRect.top + 4,
              left: coords.left - editorRect.left,
            });
          }
        }
        setSlashQuery(lineText.slice(1));
        setSlashMenuOpen(true);
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
  }, [editor, slashMenuOpen]);

  const closeSlashMenu = useCallback(() => {
    if (!editor || slashStartPos.current === null) {
      setSlashMenuOpen(false);
      return;
    }
    const { state } = editor;
    const { from } = state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: slashStartPos.current, to: from })
      .run();
    setSlashMenuOpen(false);
    slashStartPos.current = null;
    setSlashQuery("");
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="hce-editor-wrapper relative border border-border rounded-xl bg-background">
      <FixedToolbar editor={editor} onPdfClick={() => pdfInputRef.current?.click()} />

      <BlockHandle editor={editor} />
      <EditorContent editor={editor} />

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
          className="absolute z-50"
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
