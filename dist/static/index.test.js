import { describe, it, expect, vi } from 'vitest';
import katex from 'katex';
import { renderStaticHtml, sanitizeHtml, transformLegacyHtml, stripHtmlToExcerpt } from './index';
/** `Math.ts`의 `renderKatex`와 같은 옵션 — 기대값을 같은 함수로 만들어 비교한다. */
const KATEX_OPTIONS = {
    throwOnError: false,
    strict: false,
    output: 'html'
};
/** 태그를 걷어내고 기본 엔티티를 디코드 — 하이라이트가 글자를 바꾸지 않았는지 확인용. */
function textOf(html) {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
}
describe('renderStaticHtml — 코드 블록 하이라이트', () => {
    it('language-* 코드에 문법 색을 입히고 구조·글자는 보존한다 (엔티티 왕복 포함)', () => {
        const input = '<pre><code class="language-cpp">#include &lt;iostream&gt;\nint main() { return 0; }</code></pre>';
        const result = renderStaticHtml(input);
        expect(result).toContain('class="hljs-');
        // 색은 code 안에 — pre·code 태그와 클래스는 원문 그대로
        expect(result).toMatch(/^<pre><code class="language-cpp">/);
        expect(result).toMatch(/<\/code><\/pre>$/);
        // 글자 왕복: 태그를 걷어내면 원문 코드 그대로
        expect(textOf(result)).toBe('#include <iostream>\nint main() { return 0; }');
    });
    it('code 자식이 없는 옛 brush 저장본은 pre 자신에 색을 넣는다', () => {
        const input = '<pre class="brush:c++; toolbar:false;">int a = 1;</pre>';
        const result = renderStaticHtml(input, { defaultLanguage: 'cpp' });
        // brush 클래스에서 언어를 추측하지 않고(defaultLanguage로) 태그는 원문 그대로
        expect(result).toMatch(/^<pre class="brush:c\+\+; toolbar:false;">/);
        expect(result).toContain('hljs-');
        expect(textOf(result)).toBe('int a = 1;');
    });
    it('이미 요소가 섞인 저장본은 건너뛴다', () => {
        const spans = '<pre><code class="language-cpp"><span class="hljs-keyword">int</span> a;</code></pre>';
        expect(renderStaticHtml(spans)).toBe(spans);
        const br = '<pre><code>line1<br>line2</code></pre>';
        expect(renderStaticHtml(br)).toBe(br);
    });
    it('언어 미지정 코드는 자동 감지로 칠한다', () => {
        const input = '<pre><code>#include &lt;cstdio&gt;\nint main() { printf("hi"); }</code></pre>';
        const result = renderStaticHtml(input);
        expect(result).toContain('hljs-');
        expect(textOf(result)).toBe('#include <cstdio>\nint main() { printf("hi"); }');
    });
});
describe('renderStaticHtml — 블록 사이 공백', () => {
    it('블록 사이 개행 전용 텍스트를 지운다', () => {
        expect(renderStaticHtml('<p>a</p>\n\n<p>b</p>')).toBe('<p>a</p><p>b</p>');
    });
    it('인라인 사이 공백은 보존한다', () => {
        const input = '<p><strong>a</strong> <em>b</em></p>\n<p>c</p>';
        expect(renderStaticHtml(input)).toBe('<p><strong>a</strong> <em>b</em></p><p>c</p>');
    });
    it('pre·code 안의 개행은 내용이라 건드리지 않는다', () => {
        const input = '<pre><code class="language-plaintext">a\n\nb</code></pre>\n<p>c</p>';
        const result = renderStaticHtml(input);
        expect(result).toContain('a\n\nb');
        expect(result).not.toContain('</pre>\n<p>');
    });
    it('`&nbsp;` 섞인 공백 전용 틈도 지운다 (U+00A0도 `\\s`다 — DOM 판정과 동일)', () => {
        /*
         * ⚠️ 빠른 탈출 게이트(`>\s*[\n\r]\s*<`)는 **원문 문자열**을 보므로 `&nbsp;` 리터럴이
         * 낀 틈만으로는 열리지 않는다(앱 DOM 버전과 같은 동작). 다른 틈의 순수 개행이
         * 게이트를 열면, `&nbsp;` 틈도 디코드 후 공백 전용으로 판정돼 지워진다.
         */
        expect(renderStaticHtml('<p>a</p>&nbsp;\n<p>b</p>\n<p>c</p>')).toBe('<p>a</p><p>b</p><p>c</p>');
    });
    it('짝 잃은 닫는 태그는 원문 그대로 흘려보낸다', () => {
        expect(renderStaticHtml('<p>a</p>\n</div><p>b</p>')).toBe('<p>a</p></div><p>b</p>');
    });
    /*
     * 윗첨자·아랫첨자는 **인라인**이라 `BLOCK_TAGS` 에 없다. 혹시 그 목록에 들어가면
     * 앞뒤 공백이 "블록 사이의 틈"으로 판정돼 `a <sup>1</sup>` 의 칸이 사라진다.
     */
    it('<sup>/<sub> 는 인라인이라 앞뒤 공백을 지우지 않는다', () => {
        const input = '<p>n <sup>2</sup> + H <sub>2</sub> O</p>';
        expect(renderStaticHtml(input)).toBe(input);
    });
});
describe('renderStaticHtml — 수식', () => {
    it('인라인 수식을 KaTeX로 렌더하고 바깥 태그는 속성째 보존한다', () => {
        const input = '<math-inline class="math-node">x^2</math-inline>';
        const expected = `<math-inline class="math-node">${katex.renderToString('x^2', {
            ...KATEX_OPTIONS,
            displayMode: false
        })}</math-inline>`;
        expect(renderStaticHtml(input)).toBe(expected);
    });
    it('디스플레이 수식은 displayMode로 렌더한다', () => {
        const input = '<math-display class="math-node">\\sum_{i=1}^{n} i</math-display>';
        const result = renderStaticHtml(input);
        expect(result).toMatch(/^<math-display class="math-node">/);
        expect(result).toContain('katex-display');
    });
    it('latex의 HTML 엔티티를 디코드한 뒤 렌더한다', () => {
        const input = '<math-inline>a &lt; b</math-inline>';
        const expected = `<math-inline>${katex.renderToString('a < b', {
            ...KATEX_OPTIONS,
            displayMode: false
        })}</math-inline>`;
        expect(renderStaticHtml(input)).toBe(expected);
    });
    it('빈 수식은 그대로 둔다', () => {
        const input = '<math-inline class="math-node"></math-inline>';
        expect(renderStaticHtml(input)).toBe(input);
    });
});
describe('renderStaticHtml — rewriteAssetUrl', () => {
    it('src·href를 태그·속성 문맥과 함께 넘기고 바뀐 것만 고쳐 쓴다', () => {
        const calls = [];
        const input = '<p><img src="https://s.jungol.co.kr/a.png"><a href="/files/f.pdf">f</a></p>';
        const result = renderStaticHtml(input, {
            rewriteAssetUrl: (url, context) => {
                calls.push({ url, ...context });
                return url.replace('https://s.jungol.co.kr', '/static/s');
            }
        });
        expect(result).toBe('<p><img src="/static/s/a.png"><a href="/files/f.pdf">f</a></p>');
        expect(calls).toEqual([
            { url: 'https://s.jungol.co.kr/a.png', tag: 'img', attr: 'src' },
            { url: '/files/f.pdf', tag: 'a', attr: 'href' }
        ]);
    });
    it('srcset은 후보마다 부르고, data URL 속 쉼표는 구분자가 아니다', () => {
        const urls = [];
        const input = '<img srcset="https://x/a.png 1x, data:image/png;base64,AA==, https://x/b.png 2x">';
        const result = renderStaticHtml(input, {
            rewriteAssetUrl: (url) => {
                urls.push(url);
                return url;
            }
        });
        expect(urls).toEqual(['https://x/a.png', 'data:image/png;base64,AA==', 'https://x/b.png']);
        expect(result).toBe(input);
    });
    it('style·background는 url(…) 안쪽만 바꾼다', () => {
        const input = '<div style="background-image:url(&quot;https://x/b.png&quot;);color:red">x</div>' +
            '<table background="url(https://x/c.png)"><tbody><tr><td>y</td></tr></tbody></table>';
        const result = renderStaticHtml(input, {
            rewriteAssetUrl: (url) => url.replace('https://x', '/cdn')
        });
        expect(result).toContain('style="background-image:url(&quot;/cdn/b.png&quot;);color:red"');
        expect(result).toContain('background="url(&quot;/cdn/c.png&quot;)"');
    });
    it('아무것도 안 바뀌면 원본 문자열을 그대로 돌려준다', () => {
        const input = '<p><img src="/local/a.png" alt="x"></p>';
        expect(renderStaticHtml(input, { rewriteAssetUrl: (url) => url })).toBe(input);
    });
});
describe('renderStaticHtml — 결정성·SSR 안전', () => {
    const combined = [
        '<h2>제목</h2>',
        '<pre><code class="language-cpp">int main() { return 0; }</code></pre>',
        '<math-display class="math-node">\\frac{1}{2}</math-display>',
        '<p><img src="https://s.jungol.co.kr/a.png"> 그림</p>'
    ].join('\n');
    const options = {
        defaultLanguage: 'cpp',
        rewriteAssetUrl: (url) => url.replace('https://s.jungol.co.kr', '/static/s')
    };
    it('같은 입력 두 번 = 같은 출력', () => {
        const first = renderStaticHtml(combined, options);
        expect(renderStaticHtml(combined, options)).toBe(first);
        // 네 단계가 전부 실제로 일했는지도 같이 확인한다
        expect(first).toContain('hljs-');
        expect(first).toContain('katex');
        expect(first).toContain('src="/static/s/a.png"');
        expect(first).not.toContain('>\n<');
    });
    it('한 번 처리한 출력을 다시 넣어도 그대로다', () => {
        const first = renderStaticHtml(combined, options);
        expect(renderStaticHtml(first, options)).toBe(first);
    });
    it('빈 입력은 그대로 돌려준다', () => {
        expect(renderStaticHtml('')).toBe('');
    });
    it('DOM·브라우저 전역 없이 동작한다', () => {
        vi.stubGlobal('document', undefined);
        vi.stubGlobal('window', undefined);
        vi.stubGlobal('DOMParser', undefined);
        try {
            const result = renderStaticHtml('<pre><code class="language-cpp">int a;</code></pre>\n<math-inline>x_1</math-inline>', { rewriteAssetUrl: (url) => url });
            expect(result).toContain('hljs-');
            expect(result).toContain('katex');
        }
        finally {
            vi.unstubAllGlobals();
        }
    });
});
describe('sanitize 유틸 재수출', () => {
    it('sanitizeHtml·transformLegacyHtml·stripHtmlToExcerpt를 모듈 직접 경로에서 다시 내보낸다', () => {
        expect(sanitizeHtml('<p onclick="x()">a</p><script>bad()</script>')).toBe('<p>a</p>');
        expect(transformLegacyHtml('')).toBe('');
        expect(stripHtmlToExcerpt('<p>hello world</p>')).toBe('hello world');
    });
});
describe('renderStaticHtml — 정적 표 스크롤 래퍼', () => {
    const table = '<table style="width:900px"><tbody><tr><td><p>A</p></td></tr></tbody></table>';
    const wrapped = `<div class="tableWrapper">${table}</div>`;
    const options = { wrapTables: true };
    it('옵트인하지 않은 기존 표 출력은 바꾸지 않는다', () => {
        expect(renderStaticHtml(table)).toBe(table);
    });
    it('표만 있는 문서와 표가 맨 앞·맨 끝인 문서의 경계를 SSR에서 감싼다', () => {
        expect(renderStaticHtml(table, options)).toBe(wrapped);
        expect(renderStaticHtml(`${table}<p>after</p>`, options)).toBe(`${wrapped}<p>after</p>`);
        expect(renderStaticHtml(`<p>before</p>${table}`, options)).toBe(`<p>before</p>${wrapped}`);
    });
    it('중첩 표와 기존 래퍼는 중복으로 감싸지 않고 다시 처리해도 같다', () => {
        const nested = `<table><tbody><tr><td>${table}</td></tr></tbody></table>`;
        const result = renderStaticHtml(nested, options);
        expect(result.match(/class="tableWrapper"/g)).toHaveLength(2);
        expect(renderStaticHtml(result, options)).toBe(result);
        const existing = `<div class="tableWrapper extra">${table}</div>`;
        expect(renderStaticHtml(existing, options)).toBe(existing);
    });
    it('colwidth만 저장된 병합 셀의 열 너비와 합계를 복원한다', () => {
        const input = '<table><tbody><tr><th colspan="2" colwidth="110,130">A</th><th colwidth="160">B</th></tr></tbody></table>';
        const result = renderStaticHtml(input, options);
        expect(result).toContain('<table style="width:400px">');
        expect(result).toContain('<colgroup><col style="width:110px"><col style="width:130px"><col style="width:160px"></colgroup>');
        expect(result).toContain('<th colspan="2" colwidth="110,130">A</th>');
        expect(renderStaticHtml(result, options)).toBe(result);
    });
    it('명시한 총너비를 보존하면서 누락된 열 비율만 복원한다', () => {
        const input = '<table style="color:red;width:200px"><tbody><tr><td colwidth="100">A</td><td colwidth="300">B</td></tr></tbody></table>';
        const result = renderStaticHtml(input, options);
        expect(result).toContain('<table style="color:red;width:200px">');
        expect(result).toContain('<colgroup><col style="width:25%"><col style="width:75%"></colgroup>');
    });
    it('기존 colgroup은 보존하고 불완전한 저장 너비는 추측하지 않는다', () => {
        const cols = '<table><colgroup><col style="width:120px"></colgroup><tbody><tr><td colwidth="120">A</td></tr></tbody></table>';
        expect(renderStaticHtml(cols, options)).toBe(`<div class="tableWrapper">${cols}</div>`);
        const invalid = '<table><tbody><tr><td colspan="2" colwidth="120">A</td></tr></tbody></table>';
        expect(renderStaticHtml(invalid, options)).toBe(`<div class="tableWrapper">${invalid}</div>`);
    });
});
