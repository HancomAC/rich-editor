"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { GripVertical, Plus } from "lucide-react";

interface BlockHandleProps {
  editor: Editor;
  onPlusClick: (top: number) => void;
}

export function BlockHandle({ editor, onPlusClick }: BlockHandleProps) {
  const [handlePos, setHandlePos] = useState<{
    top: number;
    visible: boolean;
  }>({ top: 0, visible: false });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentBlockRef = useRef<HTMLElement | null>(null);

  const updatePosition = useCallback(
    (e: MouseEvent) => {
      if (!editor?.view?.dom) return;

      const editorDom = editor.view.dom;
      const editorRect = editorDom.getBoundingClientRect();

      if (
        e.clientX < editorRect.left - 60 ||
        e.clientX > editorRect.right + 20 ||
        e.clientY < editorRect.top ||
        e.clientY > editorRect.bottom
      ) {
        setHandlePos((prev) => ({ ...prev, visible: false }));
        currentBlockRef.current = null;
        return;
      }

      const children = Array.from(editorDom.children) as HTMLElement[];
      let targetBlock: HTMLElement | null = null;

      for (const child of children) {
        const rect = child.getBoundingClientRect();
        if (e.clientY >= rect.top - 2 && e.clientY <= rect.bottom + 2) {
          targetBlock = child;
          break;
        }
      }

      if (!targetBlock) {
        setHandlePos((prev) => ({ ...prev, visible: false }));
        currentBlockRef.current = null;
        return;
      }

      if (targetBlock === currentBlockRef.current) return;
      currentBlockRef.current = targetBlock;

      const blockRect = targetBlock.getBoundingClientRect();
      const containerRect =
        wrapperRef.current?.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      setHandlePos({
        top: blockRect.top - containerRect.top,
        visible: true,
      });
    },
    [editor]
  );

  useEffect(() => {
    const editorWrapper = editor?.view?.dom?.parentElement;
    if (!editorWrapper) return;

    const root = editorWrapper.closest(".hce-editor-wrapper");
    if (!root) return;

    const handler = (e: Event) => updatePosition(e as MouseEvent);
    root.addEventListener("mousemove", handler, { passive: true });

    const hideHandler = () => {
      setHandlePos((prev) => ({ ...prev, visible: false }));
      currentBlockRef.current = null;
    };
    root.addEventListener("mouseleave", hideHandler);

    return () => {
      root.removeEventListener("mousemove", handler);
      root.removeEventListener("mouseleave", hideHandler);
    };
  }, [editor, updatePosition]);

  const handlePlusClick = useCallback(() => {
    if (!currentBlockRef.current || !editor?.view) return;

    const blockDom = currentBlockRef.current;
    const pos = editor.view.posAtDOM(blockDom, 0);
    const resolved = editor.state.doc.resolve(pos);

    const blockEnd = resolved.after(1);
    editor
      .chain()
      .focus()
      .insertContentAt(blockEnd, { type: "paragraph" })
      .setTextSelection(blockEnd + 1)
      .run();

    editor.commands.insertContent("/");
  }, [editor]);

  return (
    <div ref={wrapperRef}>
      <div
        className="absolute flex items-center gap-0.5 -left-12 transition-opacity duration-150 z-20"
        style={{
          top: handlePos.top,
          opacity: handlePos.visible ? 1 : 0,
          pointerEvents: handlePos.visible ? "auto" : "none",
        }}
      >
        <button
          type="button"
          className="p-1 rounded hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title="블록 추가"
          onClick={handlePlusClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
          title="드래그하여 이동"
          onMouseDown={(e) => e.preventDefault()}
        >
          <GripVertical size={16} />
        </button>
      </div>
    </div>
  );
}
