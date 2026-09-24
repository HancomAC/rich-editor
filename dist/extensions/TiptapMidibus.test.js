import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TiptapMidibus } from './TiptapMidibus';
import { sanitizeHtml, transformLegacyHtml } from '../utils/sanitize';
/**
 * 이 노드의 계약은 **재생이 아니라 보존**이다. 정올 prod 와 lms 는 같은 Datastore 를
 * 쓰므로, lms 에서 열었다 저장하는 것만으로 바이트가 달라지면 prod 쪽 렌더가 깨진다.
 * 그래서 여기 테스트는 전부 "넣은 것이 그대로 나오는가" 를 본다.
 */
describe('TiptapMidibus — prod 저장 형식 왕복', () => {
    let editor;
    function createEditor(content) {
        editor = new Editor({
            element: document.createElement('div'),
            extensions: [StarterKit, TiptapMidibus],
            content
        });
        return editor;
    }
    afterEach(() => {
        editor?.destroy();
    });
    /* prod `midibus/index.ts` 의 `renderHTML` 이 실제로 뱉는 꼴. 속성 순서까지 그대로다. */
    const PROD = '<tiptap-midibus id="abc123" start="0" uuid="abc123" width="100%" height="600" data-bubble-menu="false"></tiptap-midibus>';
    it('prod 저장본을 노드로 읽는다', () => {
        createEditor(PROD);
        const doc = editor.getJSON();
        const node = doc.content?.[0];
        expect(node?.type).toBe('tiptapMidibus');
        expect(node?.attrs?.id).toBe('abc123');
        expect(node?.attrs?.uuid).toBe('abc123');
    });
    it('왕복에서 바이트가 그대로다', () => {
        createEditor(PROD);
        expect(editor.getHTML()).toBe(PROD);
    });
    it('앞뒤 본문이 있어도 그대로다', () => {
        const html = `<p>앞</p>${PROD}<p>뒤</p>`;
        createEditor(html);
        expect(editor.getHTML()).toBe(html);
    });
    /*
     * ⚠️ 회귀 표적. 예전엔 이 태그를 아는 노드가 없어 파서가 통째로 버렸고, 실제로
     * 강의영상 글이 lms 에서 `<p>` 하나만 남고 비었다.
     */
    it('노드가 없으면 사라진다는 것을 함께 박아 둔다', () => {
        const bare = new Editor({
            element: document.createElement('div'),
            extensions: [StarterKit],
            content: PROD
        });
        expect(bare.getHTML()).not.toContain('tiptap-midibus');
        bare.destroy();
    });
    it('모르는 속성도 잃지 않는다', () => {
        const html = '<tiptap-midibus id="v" start="12" uuid="u" width="100%" height="600" data-bubble-menu="false" data-resize-aspect-ratio="1.777"></tiptap-midibus>';
        createEditor(html);
        expect(editor.getHTML()).toBe(html);
    });
    it('속성 순서가 prod 와 달라도 그 순서 그대로 되쓴다', () => {
        const html = '<tiptap-midibus height="400" id="v" uuid="u"></tiptap-midibus>';
        createEditor(html);
        expect(editor.getHTML()).toBe(html);
    });
    it('on* 은 되쓰지 않는다', () => {
        createEditor('<tiptap-midibus id="v" onload="alert(1)"></tiptap-midibus>');
        expect(editor.getHTML()).toBe('<tiptap-midibus id="v"></tiptap-midibus>');
    });
    it('새로 넣으면 prod 와 같은 꼴로 저장된다', () => {
        createEditor('<p></p>');
        editor.commands.setTiptapMidibus({ id: 'new1', start: 30, uuid: 'new1' });
        expect(editor.getHTML()).toContain('<tiptap-midibus id="new1" start="30" uuid="new1" width="100%" height="600" data-bubble-menu="false">');
    });
    it('transformLegacyHtml 은 이 태그를 건드리지 않는다', () => {
        expect(transformLegacyHtml(PROD)).toBe(PROD);
    });
    /*
     * ⚠️ 정적 렌더(`{@html}` + 살균) 경로. 살균의 태그 이름 패턴에 하이픈이 없어서
     * 허용 목록에 `tiptap-midibus` 가 적혀 있는데도 통째로 지워지고 있었다.
     */
    it('sanitizeHtml 을 통과한다', () => {
        const clean = sanitizeHtml(PROD);
        expect(clean).toContain('<tiptap-midibus');
        expect(clean).toContain('id="abc123"');
        expect(clean).toContain('data-bubble-menu="false"');
        expect(clean).toContain('</tiptap-midibus>');
    });
    /*
     * 호스트 플레이어 주입. **화면만 바뀌고 저장 바이트는 그대로여야 한다** — 이게
     * 깨지면 lms 에서 열었다 저장하는 것만으로 prod 쪽 렌더가 어긋난다.
     */
    describe('renderer 주입', () => {
        function createWithRenderer(content, renderer) {
            editor = new Editor({
                element: document.createElement('div'),
                extensions: [StarterKit, TiptapMidibus.configure({ renderer })],
                content
            });
            return editor;
        }
        it('주입해도 왕복 바이트가 그대로다', () => {
            createWithRenderer(PROD, ({ element }) => {
                element.appendChild(document.createElement('iframe'));
            });
            expect(editor.getHTML()).toBe(PROD);
        });
        it('모르는 속성이 붙어 있어도 주입이 바이트를 건드리지 않는다', () => {
            const html = '<tiptap-midibus id="v" start="12" uuid="u" width="100%" height="600" data-bubble-menu="false" data-resize-aspect-ratio="1.777"></tiptap-midibus>';
            createWithRenderer(html, ({ element }) => {
                element.innerHTML = '<div class="player">재생 중</div>';
            });
            expect(editor.getHTML()).toBe(html);
        });
        /*
         * ⚠️ **`height`·`start` 는 숫자로 들어온다.** TipTap 이 숫자꼴 속성값을 알아서
         * 바꾼다 — 호스트 플레이어는 문자열이라고 단정하면 안 된다(정올 `MidibusInner`
         * 는 둘 다 받도록 `Number.parseFloat(String(...))` 로 읽는다).
         */
        it('렌더러가 노드 속성을 받는다', () => {
            let seen = null;
            createWithRenderer(PROD, ({ node }) => {
                seen = { ...node.attrs };
            });
            expect(seen).toMatchObject({ id: 'abc123', uuid: 'abc123', height: 600 });
        });
        it('주입하면 자리표시자 대신 호스트 DOM 이 선다', () => {
            createWithRenderer(PROD, ({ element }) => {
                element.setAttribute('data-host-player', '1');
            });
            const dom = editor.view.dom.querySelector('[data-type="tiptapMidibus"]');
            expect(dom?.getAttribute('data-host-player')).toBe('1');
            expect(dom?.textContent).not.toContain('새 탭에서 보기');
        });
        it('false 로 사양하면 자리표시자로 되돌아간다', () => {
            createWithRenderer(PROD, ({ element }) => {
                /* 그리다 만 흔적을 남겨도 자리표시자가 깨끗해야 한다. */
                element.appendChild(document.createElement('span'));
                return false;
            });
            const dom = editor.view.dom.querySelector('[data-type="tiptapMidibus"]');
            expect(dom?.textContent).toContain('새 탭에서 보기');
            expect(editor.getHTML()).toBe(PROD);
        });
        /* 호스트가 터져도 노드까지 잃으면 안 된다 — 보존이 최우선 계약이다. */
        it('렌더러가 던져도 자리표시자로 살아남고 바이트도 그대로다', () => {
            createWithRenderer(PROD, () => {
                throw new Error('host boom');
            });
            const dom = editor.view.dom.querySelector('[data-type="tiptapMidibus"]');
            expect(dom?.textContent).toContain('강의 영상');
            expect(editor.getHTML()).toBe(PROD);
        });
        it('노드가 사라지면 치울 함수가 불린다', () => {
            let destroyed = 0;
            createWithRenderer(PROD, () => () => {
                destroyed += 1;
            });
            editor.commands.setContent('<p>비움</p>');
            expect(destroyed).toBe(1);
        });
    });
});
