import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { OrderedListMarker } from './OrderedListMarker';
import { sanitizeHtml } from '../utils/sanitize';
import { renderStaticHtml } from '../static';
/*
 * 순서목록 마커는 **입력 규칙이 전부다** — 명령으로는 못 만들고 쳐야만 나온다.
 * 그래서 `handleTextInput` 을 한 글자씩 두드려 실제 타이핑을 재현한다
 * (`insertContent` 는 입력 규칙을 태우지 않는다).
 */
describe('순서목록 마커 (OrderedListMarker)', () => {
    let editor;
    function createEditor(content = '<p></p>') {
        editor = new Editor({
            element: document.createElement('div'),
            extensions: [StarterKit.configure({ orderedList: false }), OrderedListMarker],
            content
        });
        return editor;
    }
    function type(text) {
        for (const char of text) {
            const { from, to } = editor.state.selection;
            const handled = editor.view.someProp('handleTextInput', (f) => f(editor.view, from, to, char, () => editor.state.tr.insertText(char, from, to)));
            if (!handled)
                editor.commands.insertContent(char);
        }
    }
    const json = () => editor.getJSON();
    const blocks = () => json().content ?? [];
    const firstBlock = () => blocks()[0];
    /*
     * StarterKit v3 의 `TrailingNode` 가 문서 끝에 빈 문단을 항상 하나 붙여 두므로,
     * "목록이 몇 개가 됐나"는 전체 블록 수가 아니라 orderedList 만 세야 한다.
     */
    const lists = () => blocks().filter((block) => block.type === 'orderedList');
    /** 마지막 빈 문단 안(입력 규칙을 칠 자리)으로 커서를 옮긴다. */
    function moveToTrailingParagraph() {
        editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    }
    afterEach(() => {
        editor?.destroy();
    });
    describe('마커별 입력 규칙', () => {
        it('`1. ` — 숫자 목록. type 을 심지 않아 저장본이 예전과 같다', () => {
            createEditor();
            type('1. ');
            expect(firstBlock()?.type).toBe('orderedList');
            expect(firstBlock()?.attrs?.start).toBe(1);
            expect(firstBlock()?.attrs?.type ?? null).toBeNull();
            expect(editor.getHTML()).toContain('<ol>');
        });
        it('`3. ` — 중간 번호로 시작하면 start 가 잡힌다', () => {
            createEditor();
            type('3. ');
            expect(firstBlock()?.attrs?.start).toBe(3);
            expect(editor.getHTML()).toContain('<ol start="3">');
        });
        it('`a. ` — lower-alpha. type 속성과 marker 클래스가 같이 남는다', () => {
            createEditor();
            type('a. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 1, type: 'a' });
            expect(editor.getHTML()).toContain('<ol type="a" class="marker-a">');
        });
        it('`c. ` — 알파벳 중간 시작은 서수로 환산된다 (c → 3)', () => {
            createEditor();
            type('c. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 3, type: 'a' });
            expect(editor.getHTML()).toContain('<ol start="3" type="a" class="marker-a">');
        });
        it('`B. ` — upper-alpha (B → 2)', () => {
            createEditor();
            type('B. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 2, type: 'A' });
        });
        it('`i. `/`I. ` — 로마 숫자가 알파벳 규칙보다 먼저 잡는다', () => {
            createEditor();
            type('i. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 1, type: 'i' });
            editor.destroy();
            createEditor();
            type('I. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 1, type: 'I' });
        });
        it('`ㄱ. ` — 한글 자음(kors)', () => {
            createEditor();
            type('ㄱ. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 1, type: 'kors' });
            expect(editor.getHTML()).toContain('<ol type="kors" class="marker-kors">');
        });
        it('`다. ` — 한글 음절(korc) 중간 시작 (다 → 3)', () => {
            createEditor();
            type('다. ');
            expect(firstBlock()?.attrs).toMatchObject({ start: 3, type: 'korc' });
        });
        it('마커 뒤에 친 글자는 목록 항목 안으로 들어간다', () => {
            createEditor();
            type('a. 첫째');
            const item = firstBlock()?.content?.[0];
            expect(item?.type).toBe('listItem');
            expect(item?.content?.[0].content?.[0].text).toBe('첫째');
        });
    });
    describe('직전 목록에 이어붙기', () => {
        it('숫자 — 다음 번호(3.)를 치면 두 항목짜리 목록에 붙는다', () => {
            createEditor('<ol><li><p>하나</p></li><li><p>둘</p></li></ol><p></p>');
            moveToTrailingParagraph();
            type('3. ');
            expect(lists()).toHaveLength(1);
            expect(firstBlock()?.content).toHaveLength(3);
            expect(firstBlock()?.attrs?.start).toBe(1);
        });
        it('알파벳 — `b. ` 가 type="a" 목록에 붙는다', () => {
            createEditor('<ol type="a"><li><p>ㄱ</p></li></ol><p></p>');
            moveToTrailingParagraph();
            type('b. ');
            expect(lists()).toHaveLength(1);
            expect(firstBlock()?.content).toHaveLength(2);
            expect(firstBlock()?.attrs?.type).toBe('a');
        });
        it('start 가 1 이 아닌 목록도 다음 번호부터 센다 (start=3 + 1항목 → D.)', () => {
            createEditor('<ol type="A" start="3"><li><p>셋</p></li></ol><p></p>');
            moveToTrailingParagraph();
            type('D. ');
            expect(lists()).toHaveLength(1);
            expect(firstBlock()?.content).toHaveLength(2);
        });
        it('번호가 이어져도 마커 종류가 다르면 안 붙는다 (숫자 목록 뒤 `b. `)', () => {
            createEditor('<ol><li><p>하나</p></li></ol><p></p>');
            moveToTrailingParagraph();
            type('b. ');
            expect(lists()).toHaveLength(2);
            expect(lists()[1]?.attrs).toMatchObject({ start: 2, type: 'a' });
        });
        it('번호가 안 이어지면 start 를 안고 새 목록이 선다 (1항목 뒤 `5. `)', () => {
            createEditor('<ol><li><p>하나</p></li></ol><p></p>');
            moveToTrailingParagraph();
            type('5. ');
            expect(lists()).toHaveLength(2);
            expect(lists()[1]?.attrs?.start).toBe(5);
        });
    });
    describe('sanitize 왕복', () => {
        it('type·start·marker 클래스가 살균을 그대로 통과하고, 되읽어도 속성이 남는다', () => {
            createEditor();
            type('C. ');
            const html = editor.getHTML();
            expect(html).toContain('start="3"');
            expect(html).toContain('type="A"');
            expect(html).toContain('class="marker-A"');
            const sanitized = sanitizeHtml(html);
            expect(sanitized).toContain('start="3"');
            expect(sanitized).toContain('type="A"');
            expect(sanitized).toContain('class="marker-A"');
            editor.commands.setContent(sanitized);
            expect(firstBlock()?.attrs).toMatchObject({ start: 3, type: 'A' });
        });
    });
    describe('정적 렌더 (renderStaticHtml)', () => {
        it('정올 main 이 저장한 클래스 없는 ol[type] 에 marker 클래스를 입힌다', () => {
            const out = renderStaticHtml('<ol type="A" start="3"><li><p>셋</p></li></ol>');
            expect(out).toContain('type="A"');
            expect(out).toContain('start="3"');
            expect(out).toContain('class="marker-A"');
        });
        it('이미 marker 클래스가 있으면 원본을 그대로 돌려준다', () => {
            const html = '<ol type="korc" class="marker-korc"><li><p>가</p></li></ol>';
            expect(renderStaticHtml(html)).toBe(html);
        });
        it('type 없는 목록은 건드리지 않는다', () => {
            const html = '<ol start="3"><li><p>x</p></li></ol>';
            expect(renderStaticHtml(html)).toBe(html);
        });
    });
});
