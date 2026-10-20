export interface TableScrollLabels {
    scroll: string;
    left: string;
    right: string;
}
export interface TableScrollOptions {
    labels?: TableScrollLabels;
}
/** External controls still belong to their editor when portaled into a dialog/body. */
export declare function isTableScrollControlTarget(root: HTMLElement, target: EventTarget | null): boolean;
/**
 * Add visible horizontal scrolling to editable and static tables without changing table data.
 * Call only after mounting; the returned function removes listeners, portals and owned wrappers.
 */
export declare function attachTableScrollControls(root: HTMLElement, options?: TableScrollOptions): () => void;
//# sourceMappingURL=table-scroll.d.ts.map