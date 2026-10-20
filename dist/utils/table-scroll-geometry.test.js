import { describe, expect, it } from 'vitest';
import { intersectTableMenuRect } from './table-menu-geometry';
import { positionTableScrollControl } from './table-scroll-geometry';
describe('persistent table scroll geometry', () => {
    const viewport = { top: 80, left: 8, right: 382, bottom: 720 };
    it('stays at the viewport bottom midway through a tall table', () => {
        expect(positionTableScrollControl({ top: -800, left: -900, right: 900, bottom: 1600 }, { ...viewport, left: 57, right: 318 })).toEqual({ top: 688, left: 57, width: 261 });
    });
    it('follows the table bottom when the whole remaining table is visible', () => {
        expect(positionTableScrollControl({ top: 200, left: 57, right: 1800, bottom: 450 }, viewport)).toEqual({ top: 454, left: 57, width: 325 });
    });
    it('keeps a single 48px row fully readable by using the space below the table', () => {
        expect(positionTableScrollControl({ top: 200, left: 57, right: 1800, bottom: 248 }, { top: 200, left: 57, right: 318, bottom: 284 })).toEqual({ top: 252, left: 57, width: 261 });
    });
    it('does not leave only the gutter controls visible after the table scrolls out', () => {
        expect(positionTableScrollControl({ top: -100, left: 57, right: 1800, bottom: 70 }, { top: 80, left: 57, right: 318, bottom: 106 })).toBeNull();
    });
    it('fits a nested scroll panel and the keyboard viewport', () => {
        const frame = intersectTableMenuRect({ ...viewport, bottom: 340 }, { top: 160, left: 90, right: 350, bottom: 600 });
        expect(positionTableScrollControl({ top: -500, left: 90, right: 1600, bottom: 1200 }, frame)).toEqual({ top: 308, left: 90, width: 260 });
    });
    it('hides when the table is outside the visible panel or there is no room for controls', () => {
        expect(positionTableScrollControl({ top: -800, left: 8, right: 900, bottom: 79 }, viewport)).toBeNull();
        expect(positionTableScrollControl({ top: 720, left: 8, right: 900, bottom: 1200 }, viewport)).toBeNull();
        expect(positionTableScrollControl({ top: 700, left: 8, right: 900, bottom: 1200 }, viewport)).toBeNull();
        expect(positionTableScrollControl({ top: 200, left: 300, right: 900, bottom: 1200 }, viewport)).toBeNull();
    });
});
