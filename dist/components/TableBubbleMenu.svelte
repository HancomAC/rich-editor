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
  import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
  import { intersectTableMenuRect, positionTableMenu, type TableMenuRect } from "../utils/table-menu-geometry";
  import { isTableScrollControlTarget } from "../table-scroll";
  import { cn } from "../utils/cn";
  import { splitCellPreservingHeaders } from "../utils/splitCell";
  import { defaultTranslator, type EditorMessageKey, type EditorTranslator } from "../i18n";

  const PRESET_COLORS: { labelKey: EditorMessageKey; value: string }[] = [
    { labelKey: "bgNone", value: "" },
    { labelKey: "bgGray", value: "#f1f5f9" },
    { labelKey: "bgBlue", value: "#dbeafe" },
    { labelKey: "bgGreen", value: "#dcfce7" },
    { labelKey: "bgYellow", value: "#fef9c3" },
    { labelKey: "bgOrange", value: "#ffedd5" },
    { labelKey: "bgRed", value: "#fee2e2" },
    { labelKey: "bgPurple", value: "#ede9fe" },
    { labelKey: "bgPink", value: "#fce7f3" },
  ];

  const LINE_HEIGHTS: { labelKey: EditorMessageKey; value: string }[] = [
    { labelKey: "spacingNarrow", value: "0.8" },
    { labelKey: "spacingNormal", value: "1.0" },
    { labelKey: "spacingWide", value: "1.4" },
  ];

  let {
    editor,
    t = defaultTranslator,
  }: {
    editor: Editor;
    /** 에디터 UI 번역 함수. 미주입 시 ko. */
    t?: EditorTranslator;
  } = $props();

  let visible = $state(false);
  let pos = $state({ top: 0, left: 0, width: 0, maxHeight: 0 });
  let bounds = $state<TableMenuRect>({ top: 0, left: 0, right: 0, bottom: 0 });
  let activeScroll: HTMLElement | null = null;
  let activeTable: HTMLTableElement | null = null;
  let resizeObserver: ResizeObserver | undefined;
  let headerProbe: HTMLSpanElement | undefined;
  let frame = 0;
  let dismissed = false;
  let mounted = false;
  let colorPopup: HTMLDivElement | undefined = $state();
  let spacingPopup: HTMLDivElement | undefined = $state();
  let popupPos = $state({ top: 0, left: 0, width: 160, maxHeight: 0 });
  let showColors = $state(false);
  let showLineHeight = $state(false);
  let menuEl: HTMLDivElement | undefined = $state();
  const iconSize = 14;

  function findTableNode(): { tableNode: ProseMirrorNode | null; tablePos: number } {
    const from = editor.state.selection.$from;
    for (let depth = from.depth; depth > 0; depth--) {
      const node = from.node(depth);
      if (node.type.name === 'table') return { tableNode: node, tablePos: from.before(depth) };
    }
    const node = editor.state.doc.nodeAt(from.pos);
    return node?.type.name === 'table'
      ? { tableNode: node, tablePos: from.pos }
      : { tableNode: null, tablePos: -1 };
  }

  function schedulePosition() {
    if (!mounted || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updatePosition();
    });
  }

  function setActiveTable(table: HTMLTableElement | null) {
    if (table === activeTable) return;
    if (activeTable) resizeObserver?.unobserve(activeTable);
    if (activeScroll) resizeObserver?.unobserve(activeScroll);
    activeTable = table;
    activeScroll = table?.closest<HTMLElement>('.tableWrapper') ?? null;
    if (activeTable) resizeObserver?.observe(activeTable);
    if (activeScroll) resizeObserver?.observe(activeScroll);
    showColors = false;
    showLineHeight = false;
  }

  function hideMenu() {
    visible = false;
    showColors = false;
    showLineHeight = false;
  }

  const themeTokens = [
    '--border', '--background', '--foreground', '--popover', '--muted',
    '--muted-foreground', '--primary', '--primary-foreground', '--accent',
    '--accent-foreground', '--ring', '--hce-menu-z', '--hce-menu-surface',
    '--wh-100', '--wh-500', '--gray-500', '--gray-700', '--gray-900',
    '--primary-500', '--color-line', '--radius-8', '--radius-2xl', '--shadow-popup'
  ];

  function syncTheme(element: HTMLElement) {
    const hostStyle = getComputedStyle(editor.view.dom);
    for (const token of themeTokens) {
      const value = hostStyle.getPropertyValue(token);
      if (value) element.style.setProperty(token, value);
      else element.style.removeProperty(token);
    }
    // Custom application dialogs can create a higher stacking context than the page.
    let layer = parseFloat(hostStyle.getPropertyValue('--hce-menu-z')) || 100;
    for (let ancestor = editor.view.dom.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const z = parseFloat(getComputedStyle(ancestor).zIndex);
      if (Number.isFinite(z)) layer = Math.max(layer, z + 1);
    }
    element.style.zIndex = String(layer);
  }

  function updatePosition() {
    if (editor.isDestroyed || !editor.isEditable || !editor.isActive('table')) {
      setActiveTable(null);
      hideMenu();
      return;
    }
    const wrapper = editor.view.dom.closest<HTMLElement>('.hce-editor-wrapper');
    if (!wrapper) return;
    if (menuEl) syncTheme(menuEl);
    const { tablePos } = findTableNode();
    const node = tablePos >= 0 ? editor.view.nodeDOM(tablePos) : null;
    const table = node instanceof HTMLTableElement ? node : node instanceof HTMLElement ? node.querySelector('table') : null;
    setActiveTable(table);
    if (!table || dismissed || wrapper.querySelector('.hce-toolbar .absolute')) {
      hideMenu();
      return;
    }
    const focus = document.activeElement;
    if (!editor.view.hasFocus() && !menuEl?.contains(focus) && !wrapper.contains(focus) && !isTableScrollControlTarget(editor.view.dom, focus)) {
      hideMenu();
      return;
    }
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    let visibleBounds: TableMenuRect = {
      top: viewportTop + 6,
      left: viewportLeft + 6,
      right: viewportLeft + (viewport?.width ?? window.innerWidth) - 6,
      bottom: viewportTop + (viewport?.height ?? window.innerHeight) - 6
    };
    // The scroll wrapper is the visible column, even when the table is much wider.
    visibleBounds = intersectTableMenuRect(visibleBounds, (activeScroll ?? wrapper).getBoundingClientRect(), { x: true, y: false });
    visibleBounds = intersectTableMenuRect(visibleBounds, wrapper.getBoundingClientRect(), { x: true, y: false });
    for (let ancestor = (activeScroll ?? wrapper).parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      visibleBounds = intersectTableMenuRect(visibleBounds, ancestor.getBoundingClientRect(), {
        x: /auto|scroll|hidden|clip/.test(style.overflowX),
        y: /auto|scroll|hidden|clip/.test(style.overflowY)
      });
    }
    const headerHeight = headerProbe ? parseFloat(getComputedStyle(headerProbe).top) || 0 : 0;
    let stickyOrigin = 0;
    for (let ancestor = wrapper.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
      if (/auto|scroll|hidden/.test(getComputedStyle(ancestor).overflowY)) {
        stickyOrigin = ancestor.getBoundingClientRect().top + ancestor.clientTop;
        break;
      }
    }
    visibleBounds.top = Math.max(visibleBounds.top, stickyOrigin + headerHeight + 6);
    const fixedToolbar = wrapper.querySelector<HTMLElement>('.hce-fixed-toolbar, .hce-toolbar');
    if (fixedToolbar) {
      const toolbarRect = fixedToolbar.getBoundingClientRect();
      if (toolbarRect.bottom > visibleBounds.top && toolbarRect.top < visibleBounds.bottom && getComputedStyle(fixedToolbar).display !== 'none') {
        visibleBounds.top = toolbarRect.bottom + 6;
      }
    }
    if (activeScroll && activeScroll.scrollWidth - activeScroll.clientWidth > 1) {
      // The persistent scroll dock occupies the bottom of the visible table.
      visibleBounds.bottom = Math.min(visibleBounds.bottom, table.getBoundingClientRect().bottom) - 38;
    }
    bounds = visibleBounds;
    const selectionDom = editor.view.domAtPos(Math.min(
      editor.state.selection.head + 1, editor.state.doc.content.size
    )).node;
    const selectionElement = selectionDom instanceof HTMLElement ? selectionDom : selectionDom.parentElement;
    const selectedCell = selectionElement?.closest('td, th');
    const position = positionTableMenu(
      table.getBoundingClientRect(), visibleBounds,
      menuEl?.getBoundingClientRect().height || 44,
      6, 40, selectedCell?.getBoundingClientRect()
    );
    if (!position) {
      hideMenu();
      return;
    }
    pos = position;
    visible = true;
    updatePopupPosition();
  }

  function updatePopupPosition() {
    const popup = showColors ? colorPopup : showLineHeight ? spacingPopup : null;
    if (!popup || !menuEl) return;
    const trigger = menuEl.querySelector<HTMLElement>(showColors ? '[data-table-colors]' : '[data-table-spacing]');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popupHeight = popup.scrollHeight + 2;
    const menuRect = menuEl.getBoundingClientRect();
    const width = Math.min(showColors ? 176 : 132, bounds.right - bounds.left);
    const below = bounds.bottom - rect.bottom - 6;
    const above = rect.top - bounds.top - 6;
    const openBelow = below >= popupHeight || below >= above;
    const maxHeight = Math.max(32, openBelow ? below : above);
    popupPos = {
      width,
      left: Math.max(bounds.left, Math.min(rect.left + rect.width / 2 - width / 2, bounds.right - width)) - menuRect.left,
      top: Math.max(bounds.top, Math.min(bounds.bottom - Math.min(popupHeight, maxHeight), openBelow ? rect.bottom + 6 : rect.top - Math.min(popupHeight, maxHeight) - 6)) - menuRect.top,
      maxHeight
    };
  }

  function preserveSelection(event: MouseEvent) {
    // Native range dragging and keyboard focus must continue to work.
    if ((event.target as HTMLElement).closest('button')) event.preventDefault();
  }

  /*
   * ⚠️ **버튼의 활성 여부가 갱신되게 하는 장치.**
   *
   * `editor` 는 TipTap 이 만든 평범한 객체라 `$state` 가 아니다. 그래서 `editor.can()` 을
   * 그냥 부르면 Svelte 가 의존성을 못 보고 **처음 값에 굳는다** — 셀을 여러 개 골라도
   * `mergeCells()` 가능 여부가 다시 계산되지 않아 **`셀 병합`·`셀 분할` 이 영영 비활성**
   * 이었다(사용자 지적: "표에서 셀병합 분할이 안되네?").
   *
   * 고정 툴바가 같은 이유로 이미 쓰고 있는 방식이다 — 트랜잭션마다 카운터를 올리고
   * 활성 여부를 읽는 자리에서 그 카운터를 함께 읽는다(쉼표 연산자).
   */
  let tick = $state(0);
  const canDo = (fn: (c: ReturnType<Editor["can"]>) => boolean) =>
    (tick, fn(editor.can()));

  onMount(() => {
    mounted = true;
    const wrapper = editor.view.dom.closest<HTMLElement>('.hce-editor-wrapper');
    const viewport = window.visualViewport;
    headerProbe = document.createElement('span');
    headerProbe.style.cssText = 'position:fixed;top:var(--header-height,0px);left:0;width:0;height:0;visibility:hidden;pointer-events:none';
    headerProbe.setAttribute('aria-hidden', 'true');
    wrapper?.appendChild(headerProbe);
    resizeObserver = new ResizeObserver(schedulePosition);
    resizeObserver.observe(editor.view.dom);
    if (wrapper) resizeObserver.observe(wrapper);
    const mutationObserver = new MutationObserver(schedulePosition);
    if (wrapper) mutationObserver.observe(wrapper, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    mutationObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    const bump = () => { tick++; schedulePosition(); };
    const handleOutside = (event: Event) => {
      const target = event.target as Node;
      if (menuEl?.contains(target) || isTableScrollControlTarget(editor.view.dom, target)) return;
      showColors = false;
      showLineHeight = false;
      dismissed = !wrapper?.contains(target);
      if (dismissed) hideMenu();
      else schedulePosition();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (!showColors && !showLineHeight)) return;
      event.preventDefault();
      event.stopPropagation();
      const key = showColors ? '[data-table-colors]' : '[data-table-spacing]';
      showColors = false;
      showLineHeight = false;
      menuEl?.querySelector<HTMLButtonElement>(key)?.focus({ preventScroll: true });
    };
    editor.on('transaction', bump);
    editor.on('selectionUpdate', schedulePosition);
    editor.on('update', schedulePosition);
    document.addEventListener('scroll', schedulePosition, true);
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('focusin', handleOutside, true);
    document.addEventListener('keydown', handleKey, true);
    window.addEventListener('resize', schedulePosition);
    viewport?.addEventListener('resize', schedulePosition);
    viewport?.addEventListener('scroll', schedulePosition);
    schedulePosition();
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      headerProbe?.remove();
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      editor.off('transaction', bump);
      editor.off('selectionUpdate', schedulePosition);
      editor.off('update', schedulePosition);
      document.removeEventListener('scroll', schedulePosition, true);
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('focusin', handleOutside, true);
      document.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('resize', schedulePosition);
      viewport?.removeEventListener('resize', schedulePosition);
      viewport?.removeEventListener('scroll', schedulePosition);
    };
  });

  $effect(() => {
    if (!menuEl) return;
    const element = menuEl;
    syncTheme(element);
    // Stay inside native/custom dialogs so their overlay and focus trap include the tools.
    (editor.view.dom.closest('dialog[open], [role="dialog"]') ?? document.body).appendChild(element);
    const observer = new ResizeObserver(schedulePosition);
    observer.observe(element);
    schedulePosition();
    return () => {
      observer.disconnect();
      element.remove();
    };
  });

  $effect(() => {
    const popup = showColors ? colorPopup : showLineHeight ? spacingPopup : null;
    if (!popup || !menuEl) return;
    const observer = new ResizeObserver(schedulePosition);
    observer.observe(popup);
    schedulePosition();
    return () => observer.disconnect();
  });

</script>

<div
    hidden={!visible}
    bind:this={menuEl}
    class="hce-table-bubble"
    onmousedown={preserveSelection}
    role="toolbar"
    tabindex="-1"
    aria-label={t('tableEdit')}
    style="position: fixed; top: {pos.top}px; left: {pos.left}px; width: {pos.width}px; max-height: {pos.maxHeight}px; --hce-table-action-max-height: {Math.max(28, pos.maxHeight - 12)}px"
  >
    <div class="hce-table-panel hce-floating-panel">
      <div class="hce-table-actions">
        <div class="hce-table-action-group">
      <!-- Row/Col buttons -->
      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('rowAddAbove')}
          title={t('rowAddAbove')}
          type="button"
          onclick={() => editor.chain().focus().addRowBefore().run()}
          disabled={!canDo((c) => c.addRowBefore())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.addRowBefore()) && "opacity-30 pointer-events-none",
          )}
        >
          <ArrowUpToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('rowAddAbove')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('rowAddBelow')}
          title={t('rowAddBelow')}
          type="button"
          onclick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!canDo((c) => c.addRowAfter())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.addRowAfter()) && "opacity-30 pointer-events-none",
          )}
        >
          <ArrowDownToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('rowAddBelow')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('colAddLeft')}
          title={t('colAddLeft')}
          type="button"
          onclick={() => editor.chain().focus().addColumnBefore().run()}
          disabled={!canDo((c) => c.addColumnBefore())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.addColumnBefore()) &&
              "opacity-30 pointer-events-none",
          )}
        >
          <ArrowLeftToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('colAddLeft')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('colAddRight')}
          title={t('colAddRight')}
          type="button"
          onclick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!canDo((c) => c.addColumnAfter())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.addColumnAfter()) &&
              "opacity-30 pointer-events-none",
          )}
        >
          <ArrowRightToLine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('colAddRight')}</span>
      </div>

        </div>
        <div class="hce-table-action-group">

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('headerRowToggle')}
          title={t('headerRowToggle')}
          type="button"
          onclick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!canDo((c) => c.toggleHeaderRow())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.toggleHeaderRow()) &&
              "opacity-30 pointer-events-none",
          )}
        >
          <PanelTop size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('headerRowToggle')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('headerColToggle')}
          title={t('headerColToggle')}
          type="button"
          onclick={() => editor.chain().focus().toggleHeaderColumn().run()}
          disabled={!canDo((c) => c.toggleHeaderColumn())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.toggleHeaderColumn()) &&
              "opacity-30 pointer-events-none",
          )}
        >
          <PanelLeft size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('headerColToggle')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('cellMerge')}
          title={t('cellMerge')}
          type="button"
          onclick={() => editor.chain().focus().mergeCells().run()}
          disabled={!canDo((c) => c.mergeCells())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.mergeCells()) && "opacity-30 pointer-events-none",
          )}
        >
          <Combine size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('cellMerge')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('cellSplit')}
          title={t('cellSplit')}
          type="button"
          onclick={() => splitCellPreservingHeaders(editor)}
          disabled={!canDo((c) => c.splitCell())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            !canDo((c) => c.splitCell()) && "opacity-30 pointer-events-none",
          )}
        >
          <SplitSquareHorizontal size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('cellSplit')}</span>
      </div>

        </div>
        <div class="hce-table-action-group">

      <!-- Line height -->
      <div class="hce-table-popup-trigger">
        <div class="hce-table-btn-wrap">
          <button
          aria-label={t('lineSpacing')}
          title={t('lineSpacing')}
          data-table-spacing
          aria-expanded={showLineHeight}
          aria-haspopup="true"
            type="button"
            onclick={() => {
              showLineHeight = !showLineHeight;
              showColors = false;
            }}
            class="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <UnfoldVertical size={iconSize} />
          </button>
          <span class="hce-table-btn-tooltip">{t('lineSpacing')}</span>
        </div>

      </div>

      <!-- Equal width -->
      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('widthEqual')}
          title={t('widthEqual')}
          type="button"
          class="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
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
        >
          <EqualApproximately size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('widthEqual')}</span>
      </div>

      <!-- Background color -->
      <div class="hce-table-popup-trigger">
        <div class="hce-table-btn-wrap">
          <button
          aria-label={t('cellBackground')}
          title={t('cellBackground')}
          data-table-colors
          aria-expanded={showColors}
          aria-haspopup="true"
            type="button"
            onclick={() => {
              showColors = !showColors;
              showLineHeight = false;
            }}
            class="p-1.5 rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Paintbrush size={iconSize} />
          </button>
          <span class="hce-table-btn-tooltip">{t('cellBackground')}</span>
        </div>

      </div>

        </div>
        <div class="hce-table-action-group">

      <!-- Delete buttons -->
      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('rowDelete')}
          title={t('rowDelete')}
          type="button"
          onclick={() => editor.chain().focus().deleteRow().run()}
          disabled={!canDo((c) => c.deleteRow())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-red-300 hover:bg-muted",
            !canDo((c) => c.deleteRow()) && "opacity-30 pointer-events-none",
          )}
        >
          <RowsIcon size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('rowDelete')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('colDelete')}
          title={t('colDelete')}
          type="button"
          onclick={() => editor.chain().focus().deleteColumn().run()}
          disabled={!canDo((c) => c.deleteColumn())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-red-300 hover:bg-muted",
            !canDo((c) => c.deleteColumn()) && "opacity-30 pointer-events-none",
          )}
        >
          <ColumnsIcon size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('colDelete')}</span>
      </div>

      <div class="hce-table-btn-wrap">
        <button
          aria-label={t('tableDelete')}
          title={t('tableDelete')}
          type="button"
          onclick={() => editor.chain().focus().deleteTable().run()}
          disabled={!canDo((c) => c.deleteTable())}
          class={cn(
            "p-1.5 rounded-full transition-colors",
            "text-muted-foreground hover:text-red-300 hover:bg-muted",
            !canDo((c) => c.deleteTable()) && "opacity-30 pointer-events-none",
          )}
        >
          <Trash2 size={iconSize} />
        </button>
        <span class="hce-table-btn-tooltip">{t('tableDelete')}</span>
      </div>
        </div>
      </div>
    </div>
        {#if showLineHeight}
          <div
            bind:this={spacingPopup}
            class="hce-table-popup bg-popover border border-border rounded-lg shadow-xl py-1"
            style="top: {popupPos.top}px; left: {popupPos.left}px; width: {popupPos.width}px; max-height: {popupPos.maxHeight}px"
          >
            {#each LINE_HEIGHTS as lh (lh.value)}
              <button
                type="button"
                class="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                {t(lh.labelKey)}
              </button>
            {/each}
          </div>
        {/if}
        {#if showColors}
          <div
            bind:this={colorPopup}
            class="hce-table-popup bg-popover border border-border rounded-lg shadow-xl p-2"
            style="top: {popupPos.top}px; left: {popupPos.left}px; width: {popupPos.width}px; max-height: {popupPos.maxHeight}px"
          >
            <p
              class="text-xs font-medium text-muted-foreground mb-1.5 px-1"
            >
              {t('background')}
            </p>
            <div class="grid grid-cols-3 gap-1">
              {#each PRESET_COLORS as c (c.value)}
                <button
                  type="button"
                  title={t(c.labelKey)}
                  aria-label={t(c.labelKey)}
                  class="w-full h-7 rounded-md border border-border transition-transform hover:scale-110"
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

<style>
  .hce-table-bubble {
    box-sizing: border-box;
    z-index: var(--hce-menu-z, 100);
    pointer-events: none;
  }
  .hce-table-panel {
    position: relative;
    box-sizing: border-box;
    width: -moz-fit-content;
    width: fit-content;
    max-width: 100%;
    margin-inline: auto;
    padding: 4px;
    border-radius: 12px;
    color: var(--foreground);
    background: color-mix(in srgb, var(--foreground) 8%, var(--popover, var(--background, #fff)));
    border: 1px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
    box-shadow: 0 8px 24px color-mix(in srgb, var(--foreground) 16%, transparent), 0 2px 6px color-mix(in srgb, var(--foreground) 10%, transparent);
    pointer-events: auto;
  }
  .hce-table-bubble :global(button) {
    -webkit-appearance: none;
       -moz-appearance: none;
            appearance: none;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }
  .hce-table-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px 8px;
    max-width: 100%;
    max-height: var(--hce-table-action-max-height);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .hce-table-action-group {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px;
    max-width: 100%;
    max-height: var(--hce-table-action-max-height);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .hce-table-action-group :global(button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex: 0 0 auto;
    min-width: 28px;
    min-height: 28px;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }
  .hce-table-action-group :global(button:focus-visible) {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  .hce-table-action-group :global(button:disabled) {
    opacity: 0.35;
    cursor: default;
  }
  .hce-table-btn-wrap { position: relative; display: inline-flex; }
  .hce-table-btn-tooltip { display: none; }
  .hce-table-popup-trigger { display: inline-flex; }
  .hce-table-popup {
    position: absolute;
    z-index: 2;
    pointer-events: auto;
    box-sizing: border-box;
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--border);
  }
  .hce-table-popup :global(button) { min-height: 32px; }
</style>
