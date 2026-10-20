export interface TableMenuRect {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
/** Clip one axis at a time: overflow-x containers need not clip vertical floating UI. */
export declare function intersectTableMenuRect(frame: TableMenuRect, clip: TableMenuRect, axes?: {
    x: boolean;
    y: boolean;
}): TableMenuRect;
/** Keep tools within the visible editor, including midway through a tall/wide table. */
export declare function positionTableMenu(table: TableMenuRect, frame: TableMenuRect, menuHeight: number, gap?: number, minimumHeight?: number, selection?: TableMenuRect | null): {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
} | null;
export declare function clampTableScroll(value: number, maximum: number): number;
//# sourceMappingURL=table-menu-geometry.d.ts.map