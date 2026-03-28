"use client";

import { useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { GripVertical, Plus } from "lucide-react";

export interface BlockHandleProps {
  editor: Editor;
}

const NESTED_CONFIG = { edgeDetection: { threshold: -16 } };

export function BlockHandle({ editor }: BlockHandleProps) {
  const currentNodePosRef = useRef<number | null>(null);

  const handlePlusClick = useCallback(() => {
    if (currentNodePosRef.current === null || !editor) return;

    const pos = currentNodePosRef.current;
    const resolved = editor.state.doc.resolve(pos);
    const blockEnd = resolved.after(1);

    editor
      .chain()
      .focus()
      .insertContentAt(blockEnd, { type: "paragraph" })
      .setTextSelection(blockEnd + 1)
      .insertContent("/")
      .run();
  }, [editor]);

  return (
    <DragHandle
      editor={editor}
      nested={NESTED_CONFIG}
      onNodeChange={({ pos }) => {
        currentNodePosRef.current = pos;
      }}
    >
      <div className="hce-drag-handle">
        <button
          type="button"
          className="hce-drag-handle__plus"
          title="블록 추가"
          onClick={handlePlusClick}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Plus size={16} />
        </button>
        <div className="hce-drag-handle__grip">
          <GripVertical size={16} />
        </div>
      </div>
    </DragHandle>
  );
}
