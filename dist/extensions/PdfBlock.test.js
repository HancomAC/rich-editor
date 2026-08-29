import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { PdfBlock } from './PdfBlock';
/**
 * pdf.js 를 세워 둔다. 배율 프리셋은 **페이지 원본 폭**을 알아야 값을 계산하므로,
 * 문서를 못 읽으면 그 경로 자체를 테스트할 수 없다. 기본은 A4 세로 3쪽이고,
 * 방향에 따른 차이를 보려고 `PAGE` 를 바꿀 수 있게 뒀다(`vi.hoisted` — `vi.mock` 이
 * 파일 맨 위로 끌어올려져서 보통 `const` 는 아직 초기화 전이다).
 */
const PAGE = vi.hoisted(() => ({ w: 595.28, h: 841.89 }));
// 쪽수도 테스트마다 바꿀 수 있어야 한다(화살표가 마지막 장에서 어떻게 되는지 보려면).
const PAGES = vi.hoisted(() => ({ count: 3 }));
const A4_WIDTH = 595.28;
const A4_LANDSCAPE_WIDTH = 841.89;
vi.mock('../utils/pdf', () => ({
    getPdfJs: async () => ({
        getDocument: () => ({
            promise: Promise.resolve({
                get numPages() {
                    return PAGES.count;
                },
                getPage: async () => ({
                    getViewport: ({ scale }) => ({
                        width: PAGE.w * scale,
                        height: PAGE.h * scale
                    }),
                    render: () => ({ promise: Promise.resolve() })
                })
            })
        })
    })
}));
describe('PdfBlock extension', () => {
    let editor;
    function createEditor(content = '<p></p>') {
        editor = new Editor({
            element: document.createElement('div'),
            extensions: [StarterKit, PdfBlock],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    it('registers with name "pdfBlock"', () => {
        createEditor();
        const ext = editor.extensionManager.extensions.find((e) => e.name === 'pdfBlock');
        expect(ext).toBeDefined();
    });
    it('parses <div data-pdf-src="url">', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>');
        const doc = editor.getJSON();
        const pdfNode = doc.content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode).toBeDefined();
        expect(pdfNode?.attrs?.src).toBe('https://example.com/doc.pdf');
        expect(pdfNode?.attrs?.name).toBe('doc.pdf');
    });
    it('parses <div data-pdf-id="123">', () => {
        createEditor('<div data-pdf-id="123" data-pdf-name="report.pdf"></div>');
        const doc = editor.getJSON();
        const pdfNode = doc.content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode).toBeDefined();
        expect(pdfNode?.attrs?.fileId).toBe('123');
        expect(pdfNode?.attrs?.name).toBe('report.pdf');
    });
    it('renders correct HTML with src', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-pdf-src="https://example.com/doc.pdf"');
        expect(html).toContain('data-pdf-name="doc.pdf"');
    });
    it('leaves label null and omits the attribute for legacy HTML', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>');
        const pdfNode = editor
            .getJSON()
            .content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode?.attrs?.label).toBeNull();
        // 값이 없으면 속성을 아예 뺀다 — 옛 문서와 출력이 구분되지 않아야 한다.
        expect(editor.getHTML()).not.toContain('data-pdf-label');
    });
    it('round-trips label through parse → render → parse', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf" data-pdf-label="1강 자료"></div>');
        const html = editor.getHTML();
        expect(html).toContain('data-pdf-label="1강 자료"');
        // 다운로드에 쓰이는 실제 파일명은 그대로 살아 있어야 한다.
        expect(html).toContain('data-pdf-name="doc.pdf"');
        createEditor(html);
        const pdfNode = editor
            .getJSON()
            .content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode?.attrs?.label).toBe('1강 자료');
        expect(pdfNode?.attrs?.name).toBe('doc.pdf');
    });
    it('keeps the width attribute a preset button would set', () => {
        createEditor('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-width="50%"></div>');
        const pdfNode = editor
            .getJSON()
            .content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode?.attrs?.width).toBe('50%');
        expect(editor.getHTML()).toContain('data-pdf-width="50%"');
    });
    it('uses default name "PDF" when name is missing', () => {
        createEditor('<div data-pdf-src="https://example.com/x.pdf"></div>');
        const doc = editor.getJSON();
        const pdfNode = doc.content?.find((n) => n.type === 'pdfBlock');
        expect(pdfNode?.attrs?.name).toBe('PDF');
    });
    /*
     * 조작부는 판 위에 얹혀 있고, 위아래 바는 없다. 여기 있는 단언들은 전부 한 번씩
     * 잘못 만들었다가 되돌린 것들이라 그대로 못으로 박아 둔다.
     */
    describe('node view — 판 위 조작부', () => {
        const PDF_HTML = '<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf"></div>';
        function mount(html = PDF_HTML, editable = true) {
            const element = document.createElement('div');
            document.body.appendChild(element);
            editor = new Editor({
                element,
                editable,
                extensions: [StarterKit, PdfBlock],
                content: html
            });
            const frame = element.querySelector('.pdf-frame');
            const overlay = element.querySelector('.pdf-overlay');
            return { element, frame, overlay };
        }
        it('renders no header or footer bar — only the plate', () => {
            const { frame } = mount();
            expect(frame).toBeTruthy();
            // 캔버스 · 상태문구 · 조작부. 바가 다시 생기면 여기서 걸린다.
            const kinds = [...frame.children].map((c) => c.tagName === 'CANVAS' ? 'canvas' : c.className);
            expect(kinds).toEqual(['canvas', 'pdf-status', 'pdf-overlay']);
        });
        /** 프리셋이 눌릴 수 있을 때까지 — 원본 폭을 읽어야 활성화된다. */
        async function mountLoaded(html = PDF_HTML, editable = true) {
            const m = mount(html, editable);
            for (let i = 0; i < 50; i++) {
                const b = m.overlay.querySelector('.pdf-preset');
                if (b && !b.disabled)
                    break;
                await new Promise((r) => setTimeout(r, 5));
            }
            return m;
        }
        it('gives editors the zoom presets and delete', () => {
            const { overlay } = mount();
            expect([...overlay.querySelectorAll('.pdf-preset')].map((b) => b.textContent)).toEqual(['50%', '75%', '100%', '150%']);
            expect(overlay.querySelector('.pdf-ctl-danger')).toBeTruthy();
        });
        /*
         * ⚠️ 배율은 **페이지 원본 폭에서 계산**하므로 문서를 읽기 전에는 누를 값이 없다.
         * 활성인 채로 두면 클릭이 조용히 아무 일도 안 하는 버튼이 된다.
         */
        it('keeps the presets disabled until the page size is known', async () => {
            const { overlay } = mount();
            expect([...overlay.querySelectorAll('.pdf-preset')].every((b) => b.disabled)).toBe(true);
            await mountLoaded();
            expect([...editor.view.dom.querySelectorAll('.pdf-preset')].every((b) => !b.disabled)).toBe(true);
        });
        it('hides authoring controls from readers but keeps the file actions', () => {
            const { overlay } = mount(PDF_HTML, false);
            // 저장되는 문서 속성을 읽는 사람이 건드릴 자리는 없다.
            expect(overlay.querySelector('.pdf-preset')).toBeNull();
            expect(overlay.querySelector('.pdf-ctl-danger')).toBeNull();
            expect(overlay.querySelectorAll('a.pdf-ctl').length).toBe(2);
        });
        /*
         * 이름은 어느 모드에서도 그리지 않는다. 다만 `label` 을 스키마에서 빼지는 않았다 —
         * 이미 이름을 지정해 둔 문서를 한 번 열었다 저장하는 것만으로 값이 사라지면 안 된다.
         */
        it('never paints the file name, but still round-trips the label', () => {
            for (const editable of [true, false]) {
                const { overlay } = mount('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-name="doc.pdf" data-pdf-label="1강 자료"></div>', editable);
                expect(overlay.querySelector('.pdf-cluster-start')).toBeNull();
                expect(overlay.querySelector('.pdf-name')).toBeNull();
                expect(overlay.textContent).not.toContain('1강 자료');
                expect(overlay.textContent).not.toContain('doc.pdf');
                expect(editor.getHTML()).toContain('data-pdf-label="1강 자료"');
                editor.destroy();
            }
        });
        /*
         * 저장값은 **칼럼 대비 비율이 아니라 px** 이다. 같은 칩이 어느 화면에서든 같은
         * 글자 크기를 주려면 페이지 원본 크기에서 계산해야 한다.
         */
        it('stores an absolute width computed from the page size', async () => {
            const { overlay } = await mountLoaded();
            const click = (label) => [...overlay.querySelectorAll('.pdf-preset')].find((b) => b.textContent === label).click();
            const width = () => editor
                .getJSON()
                .content?.find((n) => n.type === 'pdfBlock')
                ?.attrs?.width;
            click('100%');
            expect(width()).toBe(`${Math.round(A4_WIDTH)}px`);
            click('50%');
            expect(width()).toBe(`${Math.round(A4_WIDTH * 0.5)}px`);
            click('150%');
            expect(width()).toBe(`${Math.round(A4_WIDTH * 1.5)}px`);
        });
        /*
         * ⚠️ 폭이 바뀌면 **캔버스도 그 폭으로 다시 그려져야** 한다. 예전엔 이걸
         * `ResizeObserver` 에만 맡겨 뒀는데, 그러면 크기를 이미 아는 경로(프리셋 클릭)까지
         * 관찰자를 한 바퀴 돌아야 한다. 실제로 블록만 595px 로 줄고 캔버스는 1376px 로
         * 남는 반쪽 동작이 나왔다.
         *
         * 브라우저에서는 이 증상이 **자동화 탭이 `hidden` 이라 관찰자 콜백이 아예 안 오는
         * 것**과 구분되지 않았다. 그래서 렌더가 즉시 끝나는 여기서 판정한다.
         */
        it('redraws the canvas on a width change without waiting for an observer', async () => {
            const { overlay } = await mountLoaded();
            const frame = editor.view.dom.querySelector('.pdf-frame');
            const canvas = frame.querySelector('canvas');
            // happy-dom 에는 레이아웃이 없다 — 판이 보고할 폭을 직접 정해 준다.
            let available = 1378;
            Object.defineProperty(frame, 'clientWidth', { get: () => available });
            const click = (label) => [...overlay.querySelectorAll('.pdf-preset')].find((b) => b.textContent === label).click();
            available = Math.round(A4_WIDTH * 0.5);
            click('50%');
            await new Promise((r) => setTimeout(r, 20));
            expect(Number.parseFloat(canvas.style.width)).toBeCloseTo(available, 0);
            available = Math.round(A4_WIDTH * 1.5);
            click('150%');
            await new Promise((r) => setTimeout(r, 20));
            expect(Number.parseFloat(canvas.style.width)).toBeCloseTo(available, 0);
        });
        /*
         * 배율의 요점 — **같은 칩이 방향에 따라 다른 폭을 준다.** 글자 크기가 같아야 하므로
         * 맞는 결과다. 폭 기준이던 시절엔 세로형이 부당하게 커 보였다(같은 50% 인데 세로형
         * 높이는 가로형의 두 배였다).
         */
        it('gives portrait and landscape different widths at the same zoom', async () => {
            const at100 = async () => {
                const { overlay } = await mountLoaded();
                [...overlay.querySelectorAll('.pdf-preset')].find((b) => b.textContent === '100%').click();
                const w = editor
                    .getJSON()
                    .content?.find((n) => n.type === 'pdfBlock')
                    ?.attrs?.width;
                editor.destroy();
                return w;
            };
            PAGE.w = A4_WIDTH;
            PAGE.h = A4_LANDSCAPE_WIDTH;
            expect(await at100()).toBe(`${Math.round(A4_WIDTH)}px`);
            PAGE.w = A4_LANDSCAPE_WIDTH;
            PAGE.h = A4_WIDTH;
            expect(await at100()).toBe(`${Math.round(A4_LANDSCAPE_WIDTH)}px`);
            PAGE.w = A4_WIDTH;
            PAGE.h = A4_LANDSCAPE_WIDTH;
        });
        /*
         * ⚠️ **`selectNode`/`deselectNode` 훅을 두면 안 된다.** ProseMirror 는 그 훅이 있으면
         * "노드뷰가 알아서 표시한다"고 보고 `ProseMirror-selectednode` 클래스를 **아예 안
         * 붙인다.** 빈 함수여도 마찬가지라, 선택 테두리를 CSS 로 써도 매칭될 선택자가 생기지
         * 않는다 — 편집 중 PDF 를 클릭해도 아무 표시가 없던 이유였다(사용자 지적).
         */
        it('lets ProseMirror mark the block as selected', async () => {
            await mountLoaded();
            editor.commands.setNodeSelection(0);
            const dom = editor.view.dom.querySelector('[data-type="pdfBlock"]');
            expect(dom?.classList.contains('ProseMirror-selectednode')).toBe(true);
        });
        /*
         * ⚠️ 읽기 전용 뷰에서도 선택은 생긴다. 내용이 atom 으로 시작하면 **처음부터 그
         * 노드에 선택이 얹히고**, 클릭이 없으니 영영 안 풀린다. 그래서 PDF 로 시작하는
         * 댓글에서 조작부가 상시 떠 있었다(사용자 지적: prod 실측). 여는 조건은 편집
         * 모드로 못 박혀 있어야 한다.
         */
        it('only opens the overlay for a selected node while editing', () => {
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            const rule = css.match(/[^}]*\.pdf-overlay\s*\{\s*opacity:\s*1;\s*\}/)?.[0] ?? '';
            expect(rule).toContain('ProseMirror-selectednode');
            expect(rule).toContain("contenteditable='true'");
        });
        /* 그 클래스에 실제로 브랜드색 테두리가 걸려 있어야 의미가 있다. */
        it('rings the selected media blocks in the brand colour', () => {
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            const rule = css.match(/\.tiptap\[contenteditable='true'\] img\.ProseMirror-selectednode[^{]*\{[^}]*\}/)?.[0] ?? '';
            expect(rule).toContain('var(--primary)');
            expect(rule).toContain('outline');
            // PDF·영상도 같은 규칙에 들어 있어야 한다.
            for (const type of ['pdfBlock', 'mbusVideo', 'videoEmbed']) {
                expect(rule).toContain(`[data-type='${type}'].ProseMirror-selectednode`);
            }
            // 예전 하이라이트는 이것들을 제외해야 두 겹이 되지 않는다.
            const legacy = css.match(/\.ProseMirror-selectednode:not\(img\)[^{]*\{/)?.[0] ?? '';
            expect(legacy).toContain(":not([data-type='pdfBlock'])");
        });
        /*
         * ⚠️ 맞춤 둘은 **고정 px 로 굳히면 안 된다.** 그러면 저자 화면에서만 맞고 좁은
         * 화면으로 보는 사람에겐 의미가 없다. 지시자로 저장하고 보는 쪽에서 푼다.
         */
        it('stores the fit modes as directives, not a frozen pixel size', async () => {
            const { overlay } = await mountLoaded();
            const width = () => editor
                .getJSON()
                .content?.find((n) => n.type === 'pdfBlock')
                ?.attrs?.width;
            const fit = (name) => [...overlay.querySelectorAll('.pdf-fit')].find((b) => b.dataset.tip?.startsWith(name)).click();
            fit('너비에 맞춤');
            expect(width()).toBe('100%');
            fit('화면에 맞춤');
            expect(width()).toBe('fit');
        });
        /*
         * 숫자·아이콘만으로는 무엇을 하는지 알 수 없다 — 호버 설명이 붙어 있어야 한다.
         * (툴바 툴팁은 예전에 걷어냈으므로, 규칙이 `.pdf-overlay` 안에만 있는지도 함께 본다.)
         */
        it('explains the size controls on hover', async () => {
            const { overlay } = await mountLoaded();
            const tips = [...overlay.querySelectorAll('[data-tip]')].map((b) => b.dataset.tip ?? '');
            expect(tips.some((t) => t.includes('원본 크기의 50%'))).toBe(true);
            expect(tips.some((t) => t.startsWith('화면에 맞춤 —'))).toBe(true);
            // 네이티브 툴팁과 겹치면 두 개가 뜬다.
            expect(overlay.querySelector('.pdf-preset[title]')).toBeNull();
            expect(overlay.querySelector('.pdf-fit[title]')).toBeNull();
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            expect(css).toContain('.pdf-overlay [data-tip]::after');
            expect(css).not.toContain('\n[data-tip]::after');
        });
        /* `fit` 은 CSS 로 못 쓰는 값이라 실제 폭으로 풀려 있어야 한다. */
        it('resolves fit-to-screen into a real width', async () => {
            await mountLoaded('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-width="fit"></div>');
            const block = editor.view.dom.querySelector('[data-type="pdfBlock"]');
            expect(block.style.width).not.toBe('fit');
            expect(block.style.width).toMatch(/^\d+px$/);
            // 한 장이 창에 들어가야 하므로 높이 기준으로 나온 폭이다.
            const usable = Math.max(240, window.innerHeight * 0.82);
            expect(Number.parseFloat(block.style.width)).toBeCloseTo(A4_WIDTH * (usable / 841.89), 0);
        });
        /*
         * 블록을 골라 두면 ← → 로 쪽을 넘긴다. 본문을 쓰다 우연히 넘어가면 안 되므로
         * **선택돼 있을 때만** 듣는다.
         */
        it('turns pages with the arrow keys once the block is selected', async () => {
            const { overlay } = await mountLoaded();
            const counter = () => overlay.querySelector('.pdf-page')?.textContent;
            expect(counter()).toBe('1 / 3');
            editor.commands.setNodeSelection(0);
            editor.view.someProp('handleKeyDown', (f) => f(editor.view, new KeyboardEvent('keydown', { key: 'ArrowRight' })));
            expect(counter()).toBe('2 / 3');
            editor.view.someProp('handleKeyDown', (f) => f(editor.view, new KeyboardEvent('keydown', { key: 'ArrowLeft' })));
            expect(counter()).toBe('1 / 3');
        });
        /*
         * ⚠️ 처리하지 못한 화살표는 **삼키면 안 된다.** atom 노드에서 좌우 화살표는
         * 블록 밖으로 빠져나가는 길이라, 한 장짜리 PDF 에서 삼키면 갇힌다.
         */
        it('lets the arrow key through when there is nothing to turn to', async () => {
            PAGES.count = 1;
            await mountLoaded();
            editor.commands.setNodeSelection(0);
            const handled = editor.view.someProp('handleKeyDown', (f) => f(editor.view, new KeyboardEvent('keydown', { key: 'ArrowRight' })));
            expect(handled).toBeFalsy();
            PAGES.count = 3;
        });
        /*
         * ⚠️ 정작 방향키가 필요한 곳은 **읽는 화면**이다. 거기엔 노드 선택도, 선택 테두리도
         * 없으므로 키맵에 얹으면 성립하지 않는다 — 판이 포커스를 받아 직접 듣는다.
         */
        it('turns pages from the frame in read mode, where there is no selection', async () => {
            const { frame, overlay } = await mountLoaded(PDF_HTML, false);
            const counter = () => overlay.querySelector('.pdf-page')?.textContent;
            expect(counter()).toBe('1 / 3');
            // 읽기 화면에서는 클릭이 곧 포커스다.
            frame.dispatchEvent(new Event('pointerdown', { bubbles: true }));
            expect(document.activeElement).toBe(frame);
            const arrow = (key) => frame.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
            arrow('ArrowRight');
            expect(counter()).toBe('2 / 3');
            arrow('ArrowLeft');
            expect(counter()).toBe('1 / 3');
        });
        /* 포커스를 받으려면 애초에 포커스 대상이어야 한다. */
        it('makes the frame reachable by keyboard', async () => {
            const { frame } = await mountLoaded(PDF_HTML, false);
            expect(frame.tabIndex).toBe(0);
            expect(frame.getAttribute('aria-label')).toContain('방향키');
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            const rule = css.match(/\.pdf-frame:focus\s*\{[^}]*\}/)?.[0] ?? '';
            expect(rule).toContain('var(--primary)');
        });
        it('marks the preset matching the stored width', async () => {
            const { overlay } = await mountLoaded(`<div data-pdf-src="https://example.com/doc.pdf" data-pdf-width="${Math.round(A4_WIDTH * 0.75)}px"></div>`);
            const active = overlay.querySelector('.pdf-preset.is-active');
            expect(active?.textContent).toBe('75%');
            expect(active?.getAttribute('aria-pressed')).toBe('true');
        });
        /*
         * ⚠️ 옛 문서는 `"50%"` 를 들고 있다. 어느 칩과도 안 맞는 게 맞고 — 값을 손대면
         * 열었다 저장하는 것만으로 저자가 정한 크기가 바뀐다. 렌더는 그대로 돼야 한다.
         */
        it('leaves a legacy percentage alone', async () => {
            const { overlay } = await mountLoaded('<div data-pdf-src="https://example.com/doc.pdf" data-pdf-width="50%"></div>');
            expect(overlay.querySelector('.pdf-preset.is-active')).toBeNull();
            expect(editor.getHTML()).toContain('data-pdf-width="50%"');
            expect(editor.view.dom.querySelector('[data-type="pdfBlock"]')
                .style.width).toBe('50%');
        });
        it('removes the block when delete is clicked', () => {
            const { overlay } = mount();
            overlay.querySelector('.pdf-ctl-danger').click();
            const hasPdf = editor
                .getJSON()
                .content?.some((n) => n.type === 'pdfBlock');
            expect(hasPdf).toBeFalsy();
        });
        /*
         * ⚠️ 넘김 버튼이 판 가장자리에 붙으면 폭 조절 손잡이(`right: -12px`, 높이 전체)를
         * 가려 리사이즈가 통째로 죽는다. 들여쓰기는 CSS 에 있으므로 여기서는 **그 CSS 가
         * 걸리는 클래스가 실제로 붙는지**를 지킨다.
         */
        /*
         * ⚠️ 조작부를 누르면 브라우저가 거기서 글자 선택을 시작해 프리셋·쪽수가 통째로
         * 파랗게 칠해졌다(사용자 지적). 유일한 입력칸인 쪽 번호만 예외다.
         */
        it('does not let clicks select the control text', () => {
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            const rule = css.match(/\.pdf-overlay\s*\{[^}]*\}/)?.[0] ?? '';
            expect(rule).toContain('user-select: none');
            const inputRule = css.match(/\.pdf-overlay \.pdf-page-input\s*\{[^}]*\}/)?.[0] ?? '';
            expect(inputRule).toContain('user-select: text');
        });
        /*
         * ⚠️ `.pdf-ctl` 과 `.pdf-nav` 는 특이도가 같아 **순서가 승부를 가른다.** 앞에 두면
         * `.pdf-ctl { background: transparent }` 가 이겨 넘김 버튼의 판이 사라진다.
         */
        it('declares the nav plate after the generic control reset', () => {
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            expect(css.indexOf('.pdf-overlay .pdf-nav {')).toBeGreaterThan(css.indexOf('.pdf-overlay .pdf-ctl,'));
        });
        it('keeps the page arrows away from the resize handle', () => {
            const { overlay } = mount();
            // 아직 문서를 못 읽었으므로 붙어 있지 않다 — 한 장짜리에 누를 수 없는
            // 화살표가 남는 것을 막는 것도 같은 규칙이다.
            expect(overlay.querySelector('.pdf-nav')).toBeNull();
            // 손잡이는 `right: -12px` 에 `width: 14px` 이라 판 안쪽 2px 을 먹는다.
            // 들여쓰기가 그보다 작아지면 리사이즈가 죽으므로 값 자체를 지킨다.
            const css = readFileSync('src/styles/editor.css', 'utf-8');
            const inset = (rule) => Number(css.match(new RegExp(`\\.${rule}\\s*\\{[^}]*?(\\d+)px`))?.[1] ?? '0');
            expect(inset('pdf-nav-prev')).toBeGreaterThanOrEqual(12);
            expect(inset('pdf-nav-next')).toBeGreaterThanOrEqual(12);
        });
    });
});
