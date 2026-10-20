import { describe, expect, it } from 'vitest';
import { clampTableScroll, intersectTableMenuRect, positionTableMenu } from './table-menu-geometry';
describe('table menu visible bounds', () => {
    const viewport = { top: 100, left: 8, right: 382, bottom: 720 };
    it('keeps a 1802px table toolbar inside a 261px editor while the table top is offscreen', () => {
        const frame = intersectTableMenuRect(viewport, { top: -600, left: 57, right: 318, bottom: 1600 }, { x: true, y: false });
        expect(positionTableMenu({ top: -552, left: 58, right: 1860, bottom: 1800 }, frame, 96))
            .toEqual({ top: 100, left: 57, width: 261, maxHeight: 620 });
    });
    it('constrains the toolbar to a nested scroll panel and the keyboard viewport', () => {
        const keyboard = { ...viewport, bottom: 340 };
        const frame = intersectTableMenuRect(keyboard, { top: 160, left: 90, right: 350, bottom: 600 });
        const position = positionTableMenu({ top: 300, left: 90, right: 900, bottom: 1200 }, frame, 96);
        expect(position.top).toBe(198);
        expect(position.top + 96).toBeLessThanOrEqual(340);
        expect(position.left + position.width).toBe(350);
    });
    it('hides after the active table has scrolled out of view', () => {
        expect(positionTableMenu({ top: -800, left: 8, right: 900, bottom: 99 }, viewport, 96)).toBeNull();
        expect(positionTableMenu({ top: 720, left: 8, right: 900, bottom: 1400 }, viewport, 96)).toBeNull();
    });
    it('moves away from the table bottom without leaving the visible frame', () => {
        const position = positionTableMenu({ top: -800, left: 8, right: 900, bottom: 140 }, viewport, 96);
        expect(position.top).toBe(100);
    });
    it('clamps scroll controls after switching to a narrower table', () => {
        expect(clampTableScroll(900, 220)).toBe(220);
        expect(clampTableScroll(-50, 220)).toBe(0);
        expect(clampTableScroll(500, -10)).toBe(0);
    });
    it('hides when keyboard space cannot fit one action row and horizontal controls', () => {
        const table = { top: -552, left: 58, right: 1860, bottom: 1800 };
        const shortFrame = { top: 100, left: 57, right: 318, bottom: 170 };
        expect(positionTableMenu(table, shortFrame, 96, 6, 74)).toBeNull();
        expect(positionTableMenu(table, { ...shortFrame, bottom: 174 }, 96, 6, 74)).not.toBeNull();
    });
    it('docks below the selected cell when a wrapped toolbar would cover mobile editing', () => {
        const frame = { top: 412, left: 57, right: 318, bottom: 780 };
        const cell = { top: 480, left: 58, right: 208, bottom: 525 };
        const position = positionTableMenu({ top: -552, left: 58, right: 1860, bottom: 1800 }, frame, 138, 6, 74, cell);
        expect(position.top).toBe(642);
        expect(position.top).toBeGreaterThan(cell.bottom);
        expect(position.top + 138).toBe(frame.bottom);
    });
    it('keeps the upper dock when the selected cell is safely below it', () => {
        const position = positionTableMenu({ top: -552, left: 58, right: 1860, bottom: 1800 }, viewport, 96, 6, 74, { top: 450, left: 58, right: 208, bottom: 495 });
        expect(position.top).toBe(viewport.top);
    });
    it('keeps the bottom dock while horizontal scrolling moves the selected cell offscreen', () => {
        const frame = { top: 412, left: 57, right: 318, bottom: 780 };
        const table = { top: -552, left: -1504, right: 298, bottom: 1800 };
        const cell = { top: 480, left: -1504, right: -1354, bottom: 525 };
        const position = positionTableMenu(table, frame, 138, 6, 74, cell);
        expect(position.top).toBe(642);
    });
});
