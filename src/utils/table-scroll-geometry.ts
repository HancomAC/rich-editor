import { intersectTableMenuRect, type TableMenuRect } from './table-menu-geometry.js';

/** Dock to the bottom of the visible part of a table, including nested scroll panels. */
export function positionTableScrollControl(
	table: TableMenuRect,
	frame: TableMenuRect,
	height = 32
): { top: number; left: number; width: number } | null {
	const visible = intersectTableMenuRect(table, frame);
	const width = visible.right - visible.left;
	if (width < 96 || visible.bottom - visible.top < height) return null;
	// Once the end is visible, use the wrapper's reserved gutter rather than its last row.
	const belowTable = table.bottom + 4;
	const top = belowTable + height <= frame.bottom ? belowTable : visible.bottom - height;
	return { top, left: visible.left, width };
}
