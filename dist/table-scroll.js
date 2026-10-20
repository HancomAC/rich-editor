import { clampTableScroll, intersectTableMenuRect } from './utils/table-menu-geometry.js';
import { positionTableScrollControl } from './utils/table-scroll-geometry.js';
const defaultLabels = {
    scroll: '표 가로 스크롤',
    left: '표 왼쪽으로 이동',
    right: '표 오른쪽으로 이동'
};
const owners = new WeakMap();
const styles = new WeakMap();
const nativeScrollbarAttribute = 'data-hce-table-scroll-dock-visible';
const themeTokens = [
    '--border', '--background', '--foreground', '--muted', '--muted-foreground', '--primary',
    '--hce-menu-z', '--hce-menu-surface', '--wh-100', '--gray-500', '--gray-700', '--gray-900',
    '--primary-500', '--color-line'
];
const css = `
.tableWrapper[${nativeScrollbarAttribute}] { scrollbar-width: none !important; }
.tableWrapper[${nativeScrollbarAttribute}]::-webkit-scrollbar {
	display: none !important; height: 0 !important;
}
.hce-table-scroll-dock {
	position: fixed; display: flex; align-items: center; box-sizing: border-box;
	height: 32px; padding: 1px 3px; gap: 4px; border: 1px solid var(--border, var(--color-line, #dce1e7));
	border-radius: 7px; background: var(--background, var(--wh-100, #fff));
	color: var(--muted-foreground, var(--gray-500, #64748b)); box-shadow: 0 1px 4px #00000014;
	font: inherit; pointer-events: auto; direction: ltr;
}
.hce-table-scroll-dock[hidden] { display: none !important; }
.hce-table-scroll-dock button {
	display: flex; align-items: center; justify-content: center; flex: 0 0 28px;
	width: 28px; height: 28px; padding: 0; margin: 0; border: 0; border-radius: 4px;
	background: transparent; color: inherit; cursor: pointer; box-sizing: border-box;
}
.hce-table-scroll-dock button svg { width: 16px; height: 16px; }
.hce-table-scroll-dock button:hover:not(:disabled) {
	background: var(--muted, #f1f5f9); color: var(--foreground, var(--gray-900, #1e293b));
}
.hce-table-scroll-dock button:disabled { opacity: .3; cursor: default; }
.hce-table-scroll-dock input {
	flex: 1 1 auto; width: 0; min-width: 0; height: 28px; padding: 0; margin: 0;
	-webkit-appearance: none; appearance: none; border: 0; background: transparent;
	box-shadow: none; cursor: ew-resize;
}
.hce-table-scroll-dock input::-webkit-slider-runnable-track {
	height: 4px; border: 0; border-radius: 999px; box-shadow: none;
	background: var(--muted, var(--border, var(--color-line, #dce1e7)));
}
.hce-table-scroll-dock input::-webkit-slider-thumb {
	-webkit-appearance: none; appearance: none; width: 28px; height: 8px; margin-top: -2px;
	border: 0; border-radius: 999px; box-shadow: none;
	background: var(--muted-foreground, var(--gray-500, #64748b));
}
.hce-table-scroll-dock input::-moz-range-track,
.hce-table-scroll-dock input::-moz-range-progress {
	height: 4px; border: 0; border-radius: 999px; box-shadow: none;
	background: var(--muted, var(--border, var(--color-line, #dce1e7)));
}
.hce-table-scroll-dock input::-moz-range-thumb {
	width: 28px; height: 8px; border: 0; border-radius: 999px; box-shadow: none;
	background: var(--muted-foreground, var(--gray-500, #64748b));
}
.hce-table-scroll-dock input:hover:not(:disabled)::-webkit-slider-thumb {
	background: var(--foreground, var(--gray-900, #1e293b));
}
.hce-table-scroll-dock input:hover:not(:disabled)::-moz-range-thumb {
	background: var(--foreground, var(--gray-900, #1e293b));
}
.hce-table-scroll-dock input:disabled { opacity: .3; cursor: default; }
.hce-table-scroll-dock :is(button, input):focus-visible {
	outline: 2px solid var(--primary, var(--primary-500, #6366f1)); outline-offset: 1px;
}
`;
function retainStyle(document) {
    let style = styles.get(document);
    if (!style) {
        const element = document.createElement('style');
        element.dataset.hceTableScrollStyle = '';
        element.textContent = css;
        document.head.appendChild(element);
        style = { element, users: 0 };
        styles.set(document, style);
    }
    style.users++;
    return () => {
        if (!style || --style.users)
            return;
        style.element.remove();
        styles.delete(document);
    };
}
/** External controls still belong to their editor when portaled into a dialog/body. */
export function isTableScrollControlTarget(root, target) {
    const element = target;
    const control = element?.closest?.('.hce-table-scroll-dock');
    return !!control && owners.get(control) === root;
}
/**
 * Add visible horizontal scrolling to editable and static tables without changing table data.
 * Call only after mounting; the returned function removes listeners, portals and owned wrappers.
 */
export function attachTableScrollControls(root, options = {}) {
    const document = root.ownerDocument;
    const window = document.defaultView;
    if (!window)
        return () => { };
    const labels = options.labels ?? defaultLabels;
    const releaseStyle = retainStyle(document);
    // Resolve host lengths (including rem/calc) outside the contenteditable DOM.
    const headerProbe = document.createElement('span');
    headerProbe.setAttribute('aria-hidden', 'true');
    headerProbe.style.cssText = 'position:fixed;top:var(--header-height,0px);left:0;width:0;height:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(headerProbe);
    const controls = new Map();
    let disposed = false;
    let frame = 0;
    let needsScan = true;
    const viewport = window.visualViewport;
    const ancestors = [];
    for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement) {
        ancestors.push(ancestor);
    }
    function schedule() {
        if (disposed || frame)
            return;
        frame = window.requestAnimationFrame(update);
    }
    const resizeObserver = new window.ResizeObserver(schedule);
    resizeObserver.observe(root);
    for (const ancestor of ancestors)
        resizeObserver.observe(ancestor);
    function setScroll(control, value) {
        const maximum = Math.max(0, control.wrapper.scrollWidth - control.wrapper.clientWidth);
        control.wrapper.scrollLeft = clampTableScroll(value, maximum);
        syncRange(control);
        schedule();
    }
    function syncRange(control) {
        const maximum = Math.max(0, control.wrapper.scrollWidth - control.wrapper.clientWidth);
        const value = clampTableScroll(control.wrapper.scrollLeft, maximum);
        control.range.max = String(maximum);
        control.range.value = String(value);
        control.range.setAttribute('aria-valuetext', `${Math.round(maximum ? value / maximum * 100 : 0)}%`);
        control.left.disabled = value <= 1;
        control.right.disabled = value >= maximum - 1;
    }
    function restoreGutter(control) {
        const gutter = control.gutter;
        if (!gutter)
            return;
        const style = control.wrapper.style;
        // Preserve a host change made since our last frame.
        if (style.getPropertyValue('padding-bottom') === gutter.applied &&
            style.getPropertyPriority('padding-bottom') === 'important') {
            if (gutter.value)
                style.setProperty('padding-bottom', gutter.value, gutter.priority);
            else
                style.removeProperty('padding-bottom');
        }
        control.gutter = undefined;
    }
    function updateGutter(control, needed) {
        if (!needed) {
            restoreGutter(control);
            return;
        }
        const style = control.wrapper.style;
        if (control.gutter && style.getPropertyValue('padding-bottom') === control.gutter.applied &&
            style.getPropertyPriority('padding-bottom') === 'important')
            return;
        const value = style.getPropertyValue('padding-bottom');
        const priority = style.getPropertyPriority('padding-bottom');
        const padding = parseFloat(window.getComputedStyle(control.wrapper).paddingBottom) || 0;
        const applied = `${padding + 36}px`;
        control.gutter = { value, priority, applied };
        style.setProperty('padding-bottom', applied, 'important');
    }
    function setNativeScrollbarHidden(control, hidden) {
        const { wrapper } = control;
        if (hidden) {
            if (control.nativeScrollbar)
                return;
            control.nativeScrollbar = { value: wrapper.getAttribute(nativeScrollbarAttribute) };
            wrapper.setAttribute(nativeScrollbarAttribute, '');
        }
        else if (control.nativeScrollbar) {
            // Restore only our marker; keep unrelated host attributes and classes intact.
            if (wrapper.getAttribute(nativeScrollbarAttribute) === '') {
                const { value } = control.nativeScrollbar;
                if (value === null)
                    wrapper.removeAttribute(nativeScrollbarAttribute);
                else
                    wrapper.setAttribute(nativeScrollbarAttribute, value);
            }
            control.nativeScrollbar = undefined;
        }
    }
    function makeControl(table, wrapper, ownWrapper) {
        const bar = document.createElement('div');
        bar.className = 'hce-table-scroll-dock';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', labels.scroll);
        bar.contentEditable = 'false';
        bar.hidden = true;
        const button = (label, path) => {
            const element = document.createElement('button');
            element.type = 'button';
            element.setAttribute('aria-label', label);
            element.title = label;
            element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
            return element;
        };
        const left = button(labels.left, 'm15 18-6-6 6-6');
        const right = button(labels.right, 'm9 18 6-6-6-6');
        const range = document.createElement('input');
        range.type = 'range';
        range.min = '0';
        range.step = '1';
        range.setAttribute('aria-label', labels.scroll);
        bar.append(left, range, right);
        const control = { table, wrapper, ownWrapper, bar, left, right, range };
        left.addEventListener('click', () => setScroll(control, wrapper.scrollLeft - Math.max(80, wrapper.clientWidth * .75)));
        right.addEventListener('click', () => setScroll(control, wrapper.scrollLeft + Math.max(80, wrapper.clientWidth * .75)));
        range.addEventListener('input', () => setScroll(control, range.valueAsNumber));
        bar.addEventListener('mousedown', (event) => {
            // Keep the editor selection for mouse buttons; range/keyboard focus stays native.
            if (event.target.closest('button'))
                event.preventDefault();
        });
        owners.set(bar, root);
        resizeObserver.observe(table);
        resizeObserver.observe(wrapper);
        return control;
    }
    function removeControl(control) {
        setNativeScrollbarHidden(control, false);
        restoreGutter(control);
        resizeObserver.unobserve(control.table);
        resizeObserver.unobserve(control.wrapper);
        owners.delete(control.bar);
        control.bar.remove();
        if (control.ownWrapper && control.table.parentElement === control.wrapper) {
            control.wrapper.replaceWith(control.table);
        }
        else if (control.ownWrapper && !control.wrapper.hasChildNodes()) {
            // A host may already have removed the raw table during an HTML replacement.
            control.wrapper.remove();
        }
    }
    function scan() {
        needsScan = false;
        for (const [table, control] of controls) {
            if (!root.contains(table) || table.parentElement !== control.wrapper) {
                removeControl(control);
                controls.delete(table);
            }
        }
        for (const table of root.querySelectorAll('table')) {
            if (controls.has(table))
                continue;
            let wrapper = table.parentElement;
            let ownWrapper = false;
            if (!wrapper?.classList.contains('tableWrapper')) {
                // ProseMirror owns editable DOM. Its TableView supplies the wrapper instead.
                const editable = table.closest('[contenteditable]');
                if (editable && editable.getAttribute('contenteditable') !== 'false')
                    continue;
                wrapper = document.createElement('div');
                wrapper.className = 'tableWrapper';
                wrapper.style.cssText = 'width:100%;min-width:0;box-sizing:border-box;overflow-x:auto';
                table.before(wrapper);
                wrapper.appendChild(table);
                ownWrapper = true;
            }
            controls.set(table, makeControl(table, wrapper, ownWrapper));
        }
    }
    function visibleFrame(wrapper, headerHeight) {
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportLeft = viewport?.offsetLeft ?? 0;
        let bounds = {
            top: viewportTop + 4,
            left: viewportLeft + 4,
            right: viewportLeft + (viewport?.width ?? window.innerWidth) - 4,
            bottom: viewportTop + (viewport?.height ?? window.innerHeight) - 4
        };
        bounds = intersectTableMenuRect(bounds, wrapper.getBoundingClientRect());
        bounds = intersectTableMenuRect(bounds, root.getBoundingClientRect(), { x: true, y: false });
        for (let ancestor = wrapper.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
            const style = window.getComputedStyle(ancestor);
            bounds = intersectTableMenuRect(bounds, ancestor.getBoundingClientRect(), {
                x: /auto|scroll|hidden|clip/.test(style.overflowX),
                y: /auto|scroll|hidden|clip/.test(style.overflowY)
            });
        }
        bounds.top = Math.max(bounds.top, headerHeight + 4);
        return bounds;
    }
    function update() {
        frame = 0;
        if (disposed)
            return;
        if (needsScan)
            scan();
        const portal = root.closest('dialog[open], [role="dialog"]') ?? document.body;
        const hostStyle = window.getComputedStyle(root);
        const headerToken = hostStyle.getPropertyValue('--header-height');
        if (headerToken)
            headerProbe.style.setProperty('--header-height', headerToken);
        else
            headerProbe.style.removeProperty('--header-height');
        const headerHeight = parseFloat(window.getComputedStyle(headerProbe).top) || 0;
        let layer = parseFloat(hostStyle.getPropertyValue('--hce-menu-z')) || 100;
        for (const ancestor of ancestors) {
            const zIndex = parseFloat(window.getComputedStyle(ancestor).zIndex);
            if (Number.isFinite(zIndex))
                layer = Math.max(layer, zIndex + 1);
        }
        for (const control of controls.values()) {
            const { bar, wrapper, table } = control;
            const overflow = wrapper.scrollWidth - wrapper.clientWidth > 1;
            updateGutter(control, overflow);
            const position = overflow && root.isConnected && window.getComputedStyle(table).visibility !== 'hidden'
                ? positionTableScrollControl(table.getBoundingClientRect(), visibleFrame(wrapper, headerHeight)) : null;
            bar.hidden = !position;
            setNativeScrollbarHidden(control, !!position);
            if (!position)
                continue;
            if (bar.parentElement !== portal)
                portal.appendChild(bar);
            for (const token of themeTokens) {
                const value = hostStyle.getPropertyValue(token);
                if (value)
                    bar.style.setProperty(token, value);
                else
                    bar.style.removeProperty(token);
            }
            bar.style.zIndex = String(layer);
            bar.style.top = `${position.top}px`;
            bar.style.left = `${position.left}px`;
            bar.style.width = `${position.width}px`;
            syncRange(control);
        }
    }
    const mutationObserver = new window.MutationObserver(() => { needsScan = true; schedule(); });
    mutationObserver.observe(root, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'colspan', 'rowspan', 'width', 'contenteditable']
    });
    for (const ancestor of ancestors) {
        mutationObserver.observe(ancestor, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
    }
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    schedule();
    return () => {
        if (disposed)
            return;
        disposed = true;
        window.cancelAnimationFrame(frame);
        mutationObserver.disconnect();
        resizeObserver.disconnect();
        document.removeEventListener('scroll', schedule, true);
        window.removeEventListener('resize', schedule);
        viewport?.removeEventListener('resize', schedule);
        viewport?.removeEventListener('scroll', schedule);
        for (const control of controls.values())
            removeControl(control);
        controls.clear();
        headerProbe.remove();
        releaseStyle();
    };
}
