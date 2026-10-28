import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { attachTableScrollControls, isTableScrollControlTarget } from './table-scroll';
describe('persistent table scroll controls', () => {
    let frames;
    let cleanups;
    beforeEach(() => {
        frames = new Map();
        cleanups = [];
        let id = 0;
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            frames.set(++id, callback);
            return id;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
    });
    afterEach(() => {
        for (const cleanup of cleanups)
            cleanup();
        document.body.replaceChildren();
        vi.restoreAllMocks();
    });
    function flush() {
        const pending = [...frames.values()];
        frames.clear();
        for (const callback of pending)
            callback(0);
    }
    function dimensions(element, top, left, width, height) {
        vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
            top, left, right: left + width, bottom: top + height, width, height, x: left, y: top,
            toJSON: () => ({})
        });
    }
    function overflow(wrapper, width = 300, total = 1200) {
        Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: width });
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: total });
        dimensions(wrapper, 100, 40, width, 1100);
    }
    function fixture(editable = false) {
        const root = document.createElement('div');
        root.contentEditable = String(editable);
        root.innerHTML = '<div class="tableWrapper"><table style="width:1200px"><colgroup><col style="width:600px"><col style="width:600px"></colgroup><tbody><tr><td>본문</td><td>오른쪽</td></tr></tbody></table></div>';
        document.body.appendChild(root);
        const wrapper = root.querySelector('.tableWrapper');
        const table = root.querySelector('table');
        dimensions(root, 100, 40, 300, 1100);
        dimensions(table, 100, 40, 1200, 1100);
        overflow(wrapper);
        return { root, wrapper, table };
    }
    function attach(root, labels) {
        const cleanup = attachTableScrollControls(root, { labels });
        cleanups.push(cleanup);
        flush();
        return cleanup;
    }
    it('keeps roots without tables dormant on document scroll and window resize', () => {
        const root = document.createElement('div');
        root.innerHTML = '<p>A reader without tables</p>';
        document.body.appendChild(root);
        const addDocument = vi.spyOn(document, 'addEventListener');
        const addWindow = vi.spyOn(window, 'addEventListener');
        const computed = vi.spyOn(window, 'getComputedStyle');
        attach(root);
        expect(addDocument.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
        expect(addWindow.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(0);
        expect(document.querySelector('[data-hce-table-scroll-style]')).toBeNull();
        expect(computed).not.toHaveBeenCalled();
        document.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        expect(frames.size).toBe(0);
    });
    it('activates for a later table and returns to dormancy when its last table is removed', async () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        attach(root);
        const other = fixture();
        root.appendChild(other.wrapper);
        dimensions(root, 100, 40, 300, 1100);
        await new Promise((resolve) => setTimeout(resolve, 0));
        flush();
        expect(document.querySelector('.hce-table-scroll-dock')).not.toBeNull();
        root.replaceChildren();
        await new Promise((resolve) => setTimeout(resolve, 0));
        flush();
        expect(document.querySelector('.hce-table-scroll-dock')).toBeNull();
        expect(document.querySelector('[data-hce-table-scroll-style]')).toBeNull();
        document.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        expect(frames.size).toBe(0);
        root.appendChild(other.wrapper);
        await new Promise((resolve) => setTimeout(resolve, 0));
        flush();
        expect(document.querySelector('.hce-table-scroll-dock')).not.toBeNull();
    });
    async function settle() {
        for (let index = 0; index < 3; index++) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            flush();
        }
    }
    it('shares one document listener and one animation frame across active readers', () => {
        const first = fixture();
        const second = fixture();
        const add = vi.spyOn(document, 'addEventListener');
        const remove = vi.spyOn(document, 'removeEventListener');
        const cleanupFirst = attach(first.root);
        const cleanupSecond = attach(second.root);
        expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
        for (let index = 0; index < 8; index++)
            document.dispatchEvent(new Event('scroll'));
        expect(frames.size).toBe(1);
        cleanupFirst();
        expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
        cleanupSecond();
        expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
        expect(frames.size).toBe(0);
    });
    it('updates live geometry on scroll without recomputing styles or rewriting theme tokens', async () => {
        const { root, table } = fixture();
        root.style.setProperty('--background', 'rgb(1, 2, 3)');
        attach(root);
        await settle();
        const computed = vi.spyOn(window, 'getComputedStyle');
        const bar = document.querySelector('.hce-table-scroll-dock');
        const write = vi.spyOn(bar.style, 'setProperty');
        dimensions(table, -500, 40, 1200, 1100);
        for (let index = 0; index < 8; index++)
            document.dispatchEvent(new Event('scroll'));
        flush();
        expect(bar.style.top).toBe('604px');
        expect(bar.hidden).toBe(false);
        expect(bar.style.getPropertyValue('--background')).toBe('rgb(1, 2, 3)');
        expect(computed).not.toHaveBeenCalled();
        expect(write.mock.calls.filter(([name]) => name.startsWith('--'))).toHaveLength(0);
    });
    it('ignores scrolling in unrelated sibling panes', async () => {
        const { root } = fixture();
        attach(root);
        await settle();
        const sibling = document.createElement('div');
        document.body.appendChild(sibling);
        sibling.dispatchEvent(new Event('scroll', { bubbles: true }));
        expect(frames.size).toBe(0);
    });
    it('refreshes inherited themes, clipping and header height after host attributes change', async () => {
        const { root, table } = fixture();
        const host = document.createElement('div');
        document.body.appendChild(host);
        host.appendChild(root);
        root.className = 'reader';
        const stylesheet = document.createElement('style');
        stylesheet.textContent = '.night .reader { --background: rgb(4, 5, 6); --header-height: 140px; }';
        document.head.appendChild(stylesheet);
        cleanups.push(() => stylesheet.remove());
        attach(root);
        await settle();
        host.className = 'night';
        host.style.overflowX = 'hidden';
        host.style.zIndex = '300';
        dimensions(host, 0, 60, 220, 1200);
        await settle();
        const bar = document.querySelector('.hce-table-scroll-dock');
        expect(bar.style.getPropertyValue('--background')).toBe('rgb(4, 5, 6)');
        expect(bar.style.zIndex).toBe('301');
        expect(bar.style.left).toBe('60px');
        expect(bar.style.width).toBe('220px');
        dimensions(table, -1000, 40, 1200, 1140);
        document.dispatchEvent(new Event('scroll'));
        flush();
        expect(bar.hidden).toBe(true);
    });
    it('invalidates stylesheet-dependent layout on viewport resize', async () => {
        const { root } = fixture();
        attach(root);
        await settle();
        const computed = vi.spyOn(window, 'getComputedStyle');
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(computed).toHaveBeenCalledWith(root);
    });
    it('includes shadow-host clipping and invalidation', async () => {
        const { root } = fixture();
        const host = document.createElement('section');
        host.style.overflowX = 'hidden';
        dimensions(host, 0, 70, 200, 1200);
        document.body.appendChild(host);
        host.attachShadow({ mode: 'open' }).appendChild(root);
        attach(root);
        await settle();
        const bar = document.querySelector('.hce-table-scroll-dock');
        expect(bar.style.left).toBe('70px');
        expect(bar.style.width).toBe('200px');
        host.style.overflowX = 'visible';
        await settle();
        expect(bar.style.left).toBe('40px');
        expect(bar.style.width).toBe('300px');
    });
    it.each([false, true])('shows without selection in editable=%s and leaves source table HTML intact', (editable) => {
        const { root, table } = fixture(editable);
        const original = table.outerHTML;
        attach(root);
        const bar = document.querySelector('.hce-table-scroll-dock');
        expect(bar.hidden).toBe(false);
        expect(root.contains(bar)).toBe(false);
        expect(bar.style.left).toBe('40px');
        expect(bar.style.width).toBe('300px');
        expect(table.outerHTML).toBe(original);
        expect(isTableScrollControlTarget(root, bar.querySelector('input'))).toBe(true);
        expect(isTableScrollControlTarget(document.createElement('div'), bar)).toBe(false);
    });
    it('synchronizes buttons, range dragging and native table scrolling at both limits', () => {
        const { root, wrapper } = fixture();
        attach(root);
        const range = document.querySelector('.hce-table-scroll-dock input');
        const [left, right] = document.querySelectorAll('.hce-table-scroll-dock button');
        expect(left.disabled).toBe(true);
        right.click();
        expect(wrapper.scrollLeft).toBe(225);
        range.value = '850';
        range.dispatchEvent(new Event('input'));
        expect(wrapper.scrollLeft).toBe(850);
        right.click();
        expect(wrapper.scrollLeft).toBe(900);
        expect(right.disabled).toBe(true);
        wrapper.scrollLeft = 120;
        wrapper.dispatchEvent(new Event('scroll'));
        flush();
        expect(range.value).toBe('120');
        left.click();
        expect(wrapper.scrollLeft).toBe(0);
        expect(left.disabled).toBe(true);
    });
    it('hides a table that fits, or one that has scrolled outside the viewport', () => {
        const { root, wrapper, table } = fixture();
        attach(root);
        const bar = document.querySelector('.hce-table-scroll-dock');
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 300 });
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(bar.hidden).toBe(true);
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 1200 });
        dimensions(table, -2000, 40, 1200, 1100);
        document.dispatchEvent(new Event('scroll'));
        flush();
        expect(bar.hidden).toBe(true);
    });
    it('hides the native scrollbar only while the replacement dock is visible', () => {
        const { root, wrapper, table } = fixture();
        const marker = 'data-hce-table-scroll-dock-visible';
        wrapper.classList.add('host-table');
        wrapper.style.overflowX = 'auto';
        const cleanup = attach(root);
        expect(wrapper.hasAttribute(marker)).toBe(true);
        expect(wrapper.style.overflowX).toBe('auto');
        expect(document.querySelector('[data-hce-table-scroll-style]')?.textContent)
            .toContain(`.tableWrapper[${marker}]::-webkit-scrollbar`);
        dimensions(wrapper, 100, 40, 90, 1100);
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.hasAttribute(marker)).toBe(false);
        dimensions(wrapper, 100, 40, 300, 1100);
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.hasAttribute(marker)).toBe(true);
        dimensions(table, -2000, 40, 1200, 1100);
        document.dispatchEvent(new Event('scroll'));
        flush();
        expect(wrapper.hasAttribute(marker)).toBe(false);
        dimensions(table, 100, 40, 1200, 1100);
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.hasAttribute(marker)).toBe(true);
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 300 });
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.hasAttribute(marker)).toBe(false);
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 1200 });
        window.dispatchEvent(new Event('resize'));
        flush();
        cleanup();
        expect(wrapper.hasAttribute(marker)).toBe(false);
        expect(wrapper.classList.contains('host-table')).toBe(true);
        expect(wrapper.style.overflowX).toBe('auto');
    });
    it('restores a preexisting host marker value when removing the replacement dock', () => {
        const { root, wrapper } = fixture();
        const marker = 'data-hce-table-scroll-dock-visible';
        wrapper.setAttribute(marker, 'host-value');
        const cleanup = attach(root);
        expect(wrapper.getAttribute(marker)).toBe('');
        cleanup();
        expect(wrapper.getAttribute(marker)).toBe('host-value');
    });
    it('adds a gutter to the existing padding and restores it when overflow ends or on cleanup', () => {
        const { root, wrapper } = fixture();
        wrapper.style.setProperty('padding-bottom', '12px', 'important');
        const cleanup = attach(root);
        expect(wrapper.style.paddingBottom).toBe('48px');
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 300 });
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.style.paddingBottom).toBe('12px');
        expect(wrapper.style.getPropertyPriority('padding-bottom')).toBe('important');
        Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, value: 1200 });
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.style.paddingBottom).toBe('48px');
        wrapper.style.borderColor = 'red';
        cleanup();
        expect(wrapper.style.paddingBottom).toBe('12px');
        expect(wrapper.style.borderColor).toBe('red');
    });
    it('keeps the latest host padding change after the gutter is cleaned up', () => {
        const { root, wrapper } = fixture();
        const cleanup = attach(root);
        wrapper.style.paddingBottom = '20px';
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(wrapper.style.paddingBottom).toBe('56px');
        cleanup();
        expect(wrapper.style.paddingBottom).toBe('20px');
        expect(wrapper.style.getPropertyPriority('padding-bottom')).toBe('');
    });
    it('keeps ProseMirror table data and undo history unchanged after its wrapper gutter mutates', async () => {
        const mount = document.createElement('div');
        document.body.appendChild(mount);
        const editor = new Editor({
            element: mount,
            extensions: [StarterKit, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell],
            content: '<table><tbody><tr><td colwidth="600"><p>왼쪽</p></td><td colwidth="600"><p>오른쪽</p></td></tr></tbody></table>'
        });
        const root = editor.view.dom;
        const wrapper = root.querySelector('.tableWrapper');
        const table = root.querySelector('table');
        dimensions(root, 100, 40, 300, 1100);
        dimensions(table, 100, 40, 1200, 1100);
        overflow(wrapper);
        const original = editor.getHTML();
        attach(root);
        cleanups.push(() => editor.destroy());
        await new Promise((resolve) => setTimeout(resolve, 0));
        flush();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(editor.getHTML()).toBe(original);
        expect(editor.can().undo()).toBe(false);
        expect(wrapper.style.paddingBottom).toBe('36px');
        expect(root.querySelector('.tableWrapper')).toBe(wrapper);
    });
    it('keeps portal controls within the native dialog and honors custom labels', () => {
        const { root } = fixture();
        const dialog = document.createElement('dialog');
        dialog.open = true;
        document.body.appendChild(dialog);
        dialog.appendChild(root);
        attach(root, { scroll: 'Scroll table', left: 'Scroll left', right: 'Scroll right' });
        const bar = dialog.querySelector('.hce-table-scroll-dock');
        expect(bar.parentElement).toBe(dialog);
        expect(bar.querySelector('input')?.getAttribute('aria-label')).toBe('Scroll table');
    });
    it('offsets the dock by a transformed dialog that contains fixed descendants', () => {
        const { root } = fixture();
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(dialog);
        dialog.appendChild(root);
        const rect = Element.prototype.getBoundingClientRect;
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
            // The browser places a fixed probe at the transformed dialog's origin.
            if (this.parentElement === dialog && this.tagName === 'SPAN') {
                return { top: 60, left: 30, right: 30, bottom: 60, width: 0, height: 0, x: 30, y: 60, toJSON: () => ({}) };
            }
            return rect.call(this);
        });
        attach(root);
        const bar = dialog.querySelector('.hce-table-scroll-dock');
        expect(bar.style.left).toBe('10px');
        expect(bar.style.width).toBe('300px');
    });
    it('hides the remaining table fragment when it is completely behind the host fixed header', () => {
        const { root, table } = fixture();
        root.style.setProperty('--header-height', '80px');
        dimensions(table, -1000, 40, 1200, 1070);
        attach(root);
        expect(document.querySelector('.hce-table-scroll-dock')).toBeNull();
    });
    it('wraps only static raw tables and restores their DOM on cleanup', () => {
        const { root, table } = fixture();
        root.replaceChildren(table);
        const original = root.innerHTML;
        const cleanup = attach(root);
        expect(table.parentElement?.classList.contains('tableWrapper')).toBe(true);
        cleanup();
        expect(root.innerHTML).toBe(original);
        expect(document.querySelector('.hce-table-scroll-dock')).toBeNull();
        expect(document.querySelector('[data-hce-table-scroll-style]')).toBeNull();
    });
    it('does not insert a wrapper into ProseMirror-owned editable DOM', () => {
        const { root, table } = fixture(true);
        root.replaceChildren(table);
        const original = root.innerHTML;
        attach(root);
        expect(root.innerHTML).toBe(original);
        expect(root.querySelector('.tableWrapper')).toBeNull();
    });
    it('removes an empty owned wrapper when the host has already removed its raw table', async () => {
        const { root, table } = fixture();
        root.replaceChildren(table);
        attach(root);
        const wrapper = table.parentElement;
        table.remove();
        await new Promise((resolve) => setTimeout(resolve, 0));
        flush();
        expect(root.contains(wrapper)).toBe(false);
        expect(document.querySelector('.hce-table-scroll-dock')).toBeNull();
    });
    it('removes stale portals after content replacement and scans newly inserted tables', async () => {
        const { root } = fixture();
        const second = fixture();
        attach(root);
        root.replaceChildren(second.wrapper);
        await new Promise((resolve) => setTimeout(resolve, 0));
        flush();
        expect(document.querySelectorAll('.hce-table-scroll-dock')).toHaveLength(1);
        expect(document.querySelector('.hce-table-scroll-dock')?.hidden).toBe(false);
    });
    it('shares its style across roots and releases all listeners, portals and pending work', () => {
        const first = fixture();
        const second = fixture();
        const cleanupFirst = attach(first.root);
        const cleanupSecond = attach(second.root);
        expect(document.querySelectorAll('[data-hce-table-scroll-style]')).toHaveLength(1);
        cleanupFirst();
        expect(document.querySelectorAll('.hce-table-scroll-dock')).toHaveLength(1);
        expect(document.querySelectorAll('[data-hce-table-scroll-style]')).toHaveLength(1);
        window.dispatchEvent(new Event('resize'));
        cleanupSecond();
        flush();
        expect(document.querySelector('.hce-table-scroll-dock')).toBeNull();
        expect(document.querySelector('[data-hce-table-scroll-style]')).toBeNull();
        expect(frames.size).toBe(0);
    });
});
