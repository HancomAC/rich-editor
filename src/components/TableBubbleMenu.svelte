<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import {
    ArrowUpToLine,
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRightToLine,
    Trash2,
    PanelTop,
    PanelLeft,
    Combine,
    SplitSquareHorizontal,
    Paintbrush,
    UnfoldVertical,
    EqualApproximately,
    RowsIcon,
    ColumnsIcon,
  } from "lucide-svelte";
  import { onMount } from "svelte";
  import { cn } from "../utils/cn";

  const PRESET_COLORS = [
    { label: "없음", value: "" },
    { label: "밝은 회색", value: "#f1f5f9" },
    { label: "밝은 파랑", value: "#dbeafe" },
    { label: "밝은 초록", value: "#dcfce7" },
    { label: "밝은 노랑", value: "#fef9c3" },
    { label: "밝은 주황", value: "#ffedd5" },
    { label: "밝은 빨강", value: "#fee2e2" },
    { label: "밝은 보라", value: "#ede9fe" },
    { label: "밝은 분홍", value: "#fce7f3" },
  ];

  const LINE_HEIGHTS = [
    { label: "좁게", value: "0.8" },
    { label: "보통", value: "1.0" },
    { label: "넓게", value: "1.4" },
  ];

  let { editor }: { editor: Editor } = $props();

  let visible = $state(false);
  let pos = $state({ top: 0, left: 0, width: 0 });
  let showColors = $state(false);
  let showLineHeight = $state(false);
  let menuEl: HTMLDivElement | undefined = $state();
  const iconSize = 14;

  function findTableNode() {
    const { state } = editor;
    const { from } = state.selection;
    let tablePos = -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableNode: any = null;
    state.doc.descendants((node, nodePos) => {
      if (
        node.type.name === "table" &&
        nodePos <= from &&
        nodePos + node.nodeSize >= from
      ) {
        tablePos = nodePos;
        tableNode = node;
        return false;
      }
    });
    return { tableNode, tablePos };
  }

  function updatePosition() {
    if (!editor.isActive("table")) {
      visible = false;
      return;
    }
    const { from } = editor.state.selection;
    const domAtPos = editor.view.domAtPos(from);
    const tableEl =
      (domAtPos.node as HTMLElement)?.closest?.("table") ||
      (domAtPos.node.parentElement as HTMLElement)?.closest?.("table");
    if (!tableEl) {
      visible = false;
      return;
    }
    const wrapper = editor.view.dom.closest(".hce-editor-wrapper");
    if (!wrapper) return;

    const tableRect = tableEl.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    pos = {
      top: tableRect.top - wrapperRect.top - 36,
      left: tableRect.left - wrapperRect.left,
      width: tableRect.width,
    };
    visible = true;
  }

  onMount(() => {
    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
    };
  });

  $effect(() => {
    if (!showColors && !showLineHeight) return;
    const handler = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        showColors = false;
        showLineHeight = false;
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });
</script>

{#if visible}
  <div
    bind:this={menuEl}
    class="absolute z-20"
    style="top: {pos.top}px; left: {pos.left}px; width: {pos.width}px"
  >
    <div
      class="flex items-center justify-center gap-0.5 px-1.5 py-1 bg-foreground rounded-lg shadow-xl w-fit mx-auto"
    >
      <!-- Row/Col buttons -->
      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().addRowBefore().run()}
          disabled={!editor.can().addRowBefore()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().addRowBefore() && "opacity-30 pointer-events-none",
          )}
        >
          <ArrowUpToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">행 위에 추가</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.can().addRowAfter()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().addRowAfter() && "opacity-30 pointer-events-none",
          )}
        >
          <ArrowDownToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">행 아래에 추가</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().addColumnBefore().run()}
          disabled={!editor.can().addColumnBefore()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().addColumnBefore() &&
              "opacity-30 pointer-events-none",
          )}
        >
          <ArrowLeftToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">열 왼쪽에 추가</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.can().addColumnAfter()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().addColumnAfter() &&
              "opacity-30 pointer-events-none",
          )}
        >
          <ArrowRightToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">열 오른쪽에 추가</span>
      </div>

      <div class="w-px h-5 bg-white/20 mx-0.5"></div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!editor.can().toggleHeaderRow()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().toggleHeaderRow() &&
              "opacity-30 pointer-events-none",
          )}
        >
          <PanelTop size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">헤더 행 토글</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().toggleHeaderColumn().run()}
          disabled={!editor.can().toggleHeaderColumn()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().toggleHeaderColumn() &&
              "opacity-30 pointer-events-none",
          )}
        >
          <PanelLeft size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">헤더 열 토글</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().mergeCells().run()}
          disabled={!editor.can().mergeCells()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().mergeCells() && "opacity-30 pointer-events-none",
          )}
        >
          <Combine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">셀 병합</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().splitCell().run()}
          disabled={!editor.can().splitCell()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-white hover:bg-white/10",
            !editor.can().splitCell() && "opacity-30 pointer-events-none",
          )}
        >
          <SplitSquareHorizontal size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">셀 분할</span>
      </div>

      <div class="w-px h-5 bg-white/20 mx-0.5"></div>

      <!-- Line height -->
      <div class="relative">
        <div class="hce-table-btn-wrap">
          <button
            type="button"
            onclick={() => {
              showLineHeight = !showLineHeight;
              showColors = false;
            }}
            class="p-1.5 rounded-md transition-colors text-white/70 hover:text-white hover:bg-white/10"
          >
            <UnfoldVertical size={iconSize} />
          </button>
          <span class="hce-table-btn-tooltip">줄 간격</span>
        </div>
        {#if showLineHeight}
          <div
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground rounded-lg shadow-xl border border-white/10 py-1"
            style="min-width: 100px"
          >
            {#each LINE_HEIGHTS as lh}
              <button
                type="button"
                class="w-full text-left px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                onclick={() => {
                  const { tr } = editor.state;
                  const { tableNode, tablePos } = findTableNode();
                  if (!tableNode || tablePos < 0) return;
                  tableNode.descendants(
                    (
                      node: {
                        type: { name: string };
                        attrs: Record<string, unknown>;
                      },
                      childPos: number,
                    ) => {
                      if (
                        node.type.name === "tableCell" ||
                        node.type.name === "tableHeader"
                      ) {
                        tr.setNodeMarkup(tablePos + childPos + 1, undefined, {
                          ...node.attrs,
                          lineHeight: lh.value,
                        });
                      }
                    },
                  );
                  editor.view.dispatch(tr);
                  showLineHeight = false;
                }}
              >
                {lh.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Equal width -->
      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => {
            const { tableNode, tablePos } = findTableNode();
            if (!tableNode || tablePos < 0) return;
            const firstRow = tableNode.firstChild;
            if (!firstRow) return;
            const colCount = firstRow.childCount;
            if (colCount === 0) return;
            const domAtPos = editor.view.domAtPos(tablePos + 1);
            const tableEl =
              (domAtPos.node as HTMLElement)?.closest?.("table") ||
              (domAtPos.node.parentElement as HTMLElement)?.closest?.("table");
            const tableWidth = tableEl?.clientWidth || 600;
            const equalWidth = Math.floor(tableWidth / colCount);
            const { tr } = editor.state;
            tableNode.descendants(
              (
                node: {
                  type: { name: string };
                  attrs: Record<string, unknown>;
                },
                childPos: number,
              ) => {
                if (
                  node.type.name === "tableCell" ||
                  node.type.name === "tableHeader"
                ) {
                  tr.setNodeMarkup(tablePos + childPos + 1, undefined, {
                    ...node.attrs,
                    colwidth: [equalWidth],
                  });
                }
              },
            );
            editor.view.dispatch(tr);
          }}
          class="p-1.5 rounded-md transition-colors text-white/70 hover:text-white hover:bg-white/10"
        >
          <EqualApproximately size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">너비 동일</span>
      </div>

      <!-- Background color -->
      <div class="relative">
        <div class="hce-table-btn-wrap">
          <button
            type="button"
            onclick={() => {
              showColors = !showColors;
              showLineHeight = false;
            }}
            class="p-1.5 rounded-md transition-colors text-white/70 hover:text-white hover:bg-white/10"
          >
            <Paintbrush size={iconSize} />
          </button>
          <span class="hce-table-btn-tooltip">셀 배경색</span>
        </div>
        {#if showColors}
          <div
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground rounded-lg shadow-xl border border-white/10 p-2"
            style="min-width: 160px"
          >
            <p
              class="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-1.5 px-1"
            >
              배경색
            </p>
            <div class="grid grid-cols-3 gap-1">
              {#each PRESET_COLORS as c}
                <button
                  type="button"
                  title={c.label}
                  class="w-full h-7 rounded-md border border-white/20 transition-transform hover:scale-110"
                  style="background: {c.value ||
                    'transparent'}; {!c.value
                    ? 'background-image: linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)'
                    : ''}"
                  onclick={() => {
                    editor
                      .chain()
                      .focus()
                      .setCellAttribute("backgroundColor", c.value || null)
                      .run();
                    showColors = false;
                  }}
                ></button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="w-px h-5 bg-white/20 mx-0.5"></div>

      <!-- Delete buttons -->
      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().deleteRow().run()}
          disabled={!editor.can().deleteRow()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-red-300 hover:bg-white/10",
            !editor.can().deleteRow() && "opacity-30 pointer-events-none",
          )}
        >
          <RowsIcon size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">행 삭제</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().deleteColumn().run()}
          disabled={!editor.can().deleteColumn()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-red-300 hover:bg-white/10",
            !editor.can().deleteColumn() && "opacity-30 pointer-events-none",
          )}
        >
          <ColumnsIcon size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">열 삭제</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          type="button"
          onclick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
          class={cn(
            "p-1.5 rounded-md transition-colors",
            "text-white/70 hover:text-red-300 hover:bg-white/10",
            !editor.can().deleteTable() && "opacity-30 pointer-events-none",
          )}
        >
          <Trash2 size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">표 삭제</span>
      </div>
    </div>
  </div>
{/if}
