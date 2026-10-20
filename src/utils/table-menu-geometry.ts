export interface TableMenuRect {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/** Clip one axis at a time: overflow-x containers need not clip vertical floating UI. */
export function intersectTableMenuRect(
	frame: TableMenuRect,
	clip: TableMenuRect,
	axes: { x: boolean; y: boolean } = { x: true, y: true }
): TableMenuRect {
	return {
		left: axes.x ? Math.max(frame.left, clip.left) : frame.left,
		right: axes.x ? Math.min(frame.right, clip.right) : frame.right,
		top: axes.y ? Math.max(frame.top, clip.top) : frame.top,
		bottom: axes.y ? Math.min(frame.bottom, clip.bottom) : frame.bottom
	};
}

/** Keep tools within the visible editor, including midway through a tall/wide table. */
export function positionTableMenu(
	table: TableMenuRect,
	frame: TableMenuRect,
	menuHeight: number,
	gap = 6,
	minimumHeight = 40,
	selection?: TableMenuRect | null
): { top: number; left: number; width: number; maxHeight: number } | null {
	const width = frame.right - frame.left;
	const height = frame.bottom - frame.top;
	if (
		width < 80 || height < minimumHeight ||
		table.bottom <= frame.top || table.top >= frame.bottom ||
		table.right <= frame.left || table.left >= frame.right
	) return null;
	const usableHeight = Math.min(menuHeight, height);
	let top = Math.max(frame.top, Math.min(
		table.top - usableHeight - gap,
		frame.bottom - usableHeight,
		table.bottom - usableHeight
	));
	if (
		selection && selection.bottom > top && selection.top < top + usableHeight
	) {
		// A wrapped menu can otherwise cover the cell the user has just tapped.
		// Prefer a stable bottom dock if it leaves the selected cell fully visible.
		// Horizontal scrolling must not move the range control away from its user.
		if (selection.bottom + gap + usableHeight <= frame.bottom) {
			top = frame.bottom - usableHeight;
		} else if (selection.top - gap - usableHeight >= frame.top) {
			top = selection.top - gap - usableHeight;
		}
	}
	return {
		top,
		left: frame.left,
		width,
		maxHeight: height
	};
}

export function clampTableScroll(value: number, maximum: number): number {
	return Math.max(0, Math.min(value, Math.max(0, maximum)));
}
