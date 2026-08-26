import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Fragment, Slice, type Node as PMNode } from '@tiptap/pm/model';
import { MathInline, MathDisplay, type MathPrompt } from './Math';

describe('Math extension', () => {
	let editor: Editor;

	function createEditor(content = '<p></p>', promptMath: MathPrompt | null = null) {
		editor = new Editor({
			element: document.createElement('div'),
			extensions: [
				StarterKit,
				promptMath ? MathInline.configure({ promptMath }) : MathInline,
				promptMath ? MathDisplay.configure({ promptMath }) : MathDisplay
			],
			content
		});
		return editor;
	}

	/** 프롬프트(마이크로태스크)와 입력규칙 시뮬레이션(setTimeout)을 함께 흘려보낸다. */
	const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

	/**
	 * TipTap 3의 `getJSON()` 반환 타입은 스키마 노드 유니온이라 `.content`/`.text` 인덱싱이 막힌다.
	 * 다른 테스트가 `.attrs`만 보느라 겪지 않던 지점 — 여기서만 최소한으로 좁혀 쓴다.
	 */
	interface JSONNode {
		type?: string;
		attrs?: Record<string, unknown>;
		text?: string;
		content?: JSONNode[];
	}
	const json = (): JSONNode => editor.getJSON() as unknown as JSONNode;

	afterEach(() => {
		editor?.destroy();
	});

	describe('등록', () => {
		it('math_inline / math_display 두 노드가 스키마에 올라간다', () => {
			createEditor();
			expect(editor.schema.nodes.math_inline).toBeDefined();
			expect(editor.schema.nodes.math_display).toBeDefined();
			// inline·atom / block·atom
			expect(editor.schema.nodes.math_inline.isInline).toBe(true);
			expect(editor.schema.nodes.math_inline.isAtom).toBe(true);
			expect(editor.schema.nodes.math_display.isBlock).toBe(true);
			expect(editor.schema.nodes.math_display.isAtom).toBe(true);
		});
	});

	// 이 확장의 존재 이유가 prod(arcturus + @seorii/prosemirror-math) 저장 포맷 호환이다.
	// 태그·클래스·LaTeX 원문 중 하나라도 흔들리면 옛 문서가 깨진다.
	describe('저장 포맷 round-trip', () => {
		const SAVED =
			'<p>앞 <math-inline class="math-node">x^2</math-inline> 뒤</p>' +
			'<math-display class="math-node">\\int_0^1 x\\,dx</math-display>';

		it('<math-inline> / <math-display> HTML을 그대로 돌려준다', () => {
			createEditor(SAVED);
			expect(editor.getHTML()).toBe(SAVED);
		});

		it('LaTeX 원문을 자식 텍스트 노드로 보관한다', () => {
			createEditor(SAVED);
			const doc = json();
			const paragraph = doc.content?.[0];
			const inline = paragraph?.content?.[1];
			expect(inline?.type).toBe('math_inline');
			expect(inline?.content?.[0]?.text).toBe('x^2');
			// 인라인 노드 앞뒤 텍스트가 살아 있어야 한다
			expect(paragraph?.content?.[0]?.text).toBe('앞 ');
			expect(paragraph?.content?.[2]?.text).toBe(' 뒤');

			const display = doc.content?.[1];
			expect(display?.type).toBe('math_display');
			expect(display?.content?.[0]?.text).toBe('\\int_0^1 x\\,dx');
		});

		it('parse → render → parse 를 거쳐도 LaTeX가 유지된다', () => {
			createEditor(SAVED);
			const html = editor.getHTML();
			editor.destroy();

			createEditor(html);
			expect(editor.getHTML()).toBe(SAVED);
		});

		it('class 없이 저장된 옛 문서도 읽고, 다시 쓸 때 class를 채운다', () => {
			createEditor('<p><math-inline>a+b</math-inline></p>');
			expect(editor.getHTML()).toBe('<p><math-inline class="math-node">a+b</math-inline></p>');
		});
	});

	// TipTap 입력 규칙은 `insertContent(..., { applyInputRules: true })` 로 시뮬레이션한다.
	// 이건 TipTap이 공식으로 두고 있는 경로다 — 플러그인이 'applyInputRules' 메타를 보고
	// setTimeout 안에서 규칙을 돌린다. 그래서 await flush() 가 필요하다.
	describe('입력 규칙', () => {
		async function type(text: string) {
			editor.commands.focus('end');
			editor.commands.insertContent({ type: 'text', text }, { applyInputRules: true });
			await flush();
		}

		it('$a^2$ → math_inline', async () => {
			createEditor('<p></p>');
			await type('$a^2$');
			const inline = json().content?.[0]?.content?.[0];
			expect(inline?.type).toBe('math_inline');
			expect(inline?.content?.[0]?.text).toBe('a^2');
		});

		it('$$a^2$$ → math_display', async () => {
			createEditor('<p></p>');
			await type('$$a^2$$');
			const display = json().content?.[0];
			expect(display?.type).toBe('math_display');
			expect(display?.content?.[0]?.text).toBe('a^2');
		});

		it('$$ + 스페이스는 빈 노드가 아니라 프롬프트를 연다', async () => {
			const seen: Array<[string, boolean]> = [];
			createEditor('<p></p>', async (latex, displayMode) => {
				seen.push([latex, displayMode]);
				return '\\frac{1}{2}';
			});
			await type('$$ ');
			await flush();

			// 새로 넣는 것이므로 현재 LaTeX는 빈 문자열, displayMode는 true
			expect(seen).toEqual([['', true]]);
			const display = json().content?.[0];
			expect(display?.type).toBe('math_display');
			expect(display?.content?.[0]?.text).toBe('\\frac{1}{2}');
			// `$$ ` 자체는 문서에 남지 않는다
			expect(editor.state.doc.textContent).not.toContain('$$');
		});
	});

	describe('붙여넣기 변환 (transformPasted)', () => {
		/** MathInline.addProseMirrorPlugins() 가 등록한 붙여넣기 플러그인을 꺼낸다. */
		function pasteTransform(e: Editor) {
			const plugin = e.state.plugins.find((p) => typeof p.props.transformPasted === 'function');
			const transform = plugin?.props.transformPasted;
			if (!plugin || !transform) throw new Error('mathPaste 플러그인을 찾지 못했다');
			// ProseMirror 시그니처는 (slice, view, plain) — 마지막 인자는 plain-text 붙여넣기 여부
			return (slice: Slice): Slice => transform.call(plugin, slice, e.view, false);
		}

		function sliceOf(...nodes: PMNode[]) {
			return new Slice(Fragment.fromArray(nodes), 0, 0);
		}

		function paragraph(text: string) {
			return editor.schema.nodes.paragraph.create(null, editor.schema.text(text));
		}

		it('텍스트에 섞인 $x^2$ 를 노드로 쪼개고 앞뒤 텍스트를 보존한다', () => {
			createEditor();
			const out = pasteTransform(editor)(sliceOf(paragraph('앞 $x^2$ 뒤')));
			const children = out.content.child(0).content;

			expect(children.childCount).toBe(3);
			expect(children.child(0).text).toBe('앞 ');
			expect(children.child(1).type.name).toBe('math_inline');
			expect(children.child(1).textContent).toBe('x^2');
			expect(children.child(2).text).toBe(' 뒤');
		});

		it('금액 표기($5 와 $10)는 건드리지 않는다', () => {
			createEditor();
			const input = sliceOf(paragraph('$5 와 $10'));
			const out = pasteTransform(editor)(input);

			// 아무것도 안 바꿨으면 원본 Slice를 그대로 돌려준다
			expect(out).toBe(input);
			expect(out.content.child(0).textContent).toBe('$5 와 $10');
		});

		it('코드 블록(spec.code) 안은 변환하지 않는다', () => {
			createEditor();
			const code = editor.schema.nodes.codeBlock.create(null, editor.schema.text('$x^2$'));
			const input = sliceOf(code);
			const out = pasteTransform(editor)(input);

			expect(out).toBe(input);
			expect(out.content.child(0).type.name).toBe('codeBlock');
			expect(out.content.child(0).textContent).toBe('$x^2$');
		});

		it('한 줄이 통째로 $$…$$ 이면 수식 블록이 된다', () => {
			createEditor();
			const out = pasteTransform(editor)(sliceOf(paragraph('$$E = mc^2$$')));

			expect(out.content.child(0).type.name).toBe('math_display');
			expect(out.content.child(0).textContent).toBe('E = mc^2');
			// 블록이 바뀌면 열린 깊이를 유지할 수 없다
			expect(out.openStart).toBe(0);
			expect(out.openEnd).toBe(0);
		});

		it('$$ 만 있는 줄로 감싼 여러 줄도 한 덩어리 수식 블록이 된다', () => {
			createEditor();
			const out = pasteTransform(editor)(
				sliceOf(paragraph('$$'), paragraph('a + b'), paragraph('$$'))
			);

			expect(out.content.childCount).toBe(1);
			expect(out.content.child(0).type.name).toBe('math_display');
			expect(out.content.child(0).textContent).toBe('a + b');
		});
	});

	describe('toggleMathInline', () => {
		it('선택한 텍스트를 math_inline 으로 감싸고, 다시 부르면 원문으로 되돌린다', () => {
			createEditor('<p>Hello</p>');

			// 감싸기 — 문단 안 텍스트 전체(1..6)를 선택
			editor.commands.setTextSelection({ from: 1, to: 6 });
			expect(editor.commands.toggleMathInline()).toBe(true);
			expect(editor.getHTML()).toBe('<p><math-inline class="math-node">Hello</math-inline></p>');

			// 풀기 — atom 이므로 NodeSelection 으로 잡는다
			editor.commands.setNodeSelection(1);
			expect(editor.commands.toggleMathInline()).toBe(true);
			expect(editor.getHTML()).toBe('<p>Hello</p>');
		});

		it('선택이 비어 있고 수식도 아니면 아무것도 하지 않는다', () => {
			createEditor('<p>Hello</p>');
			editor.commands.setTextSelection(3);
			expect(editor.commands.toggleMathInline()).toBe(false);
			expect(editor.getHTML()).toBe('<p>Hello</p>');
		});
	});

	describe('insert 커맨드', () => {
		it('insertMathInline 이 인라인 노드를 넣는다', () => {
			createEditor('<p></p>');
			editor.commands.insertMathInline('x^2');
			expect(editor.getHTML()).toContain('<math-inline class="math-node">x^2</math-inline>');
		});

		it('insertMathDisplay 가 블록 노드를 넣는다', () => {
			createEditor('<p></p>');
			editor.commands.insertMathDisplay('\\sum_{i=1}^n i');
			expect(editor.getHTML()).toContain(
				'<math-display class="math-node">\\sum_{i=1}^n i</math-display>'
			);
		});
	});

	describe('promptMath 주입', () => {
		/** 이 패키지는 Storage 타입 증강을 하지 않아 인덱스 접근에 캐스팅이 필요하다. */
		function storedPrompt(e: Editor, name: 'math_inline' | 'math_display') {
			const storage = e.storage as unknown as Record<
				string,
				{ promptMath?: MathPrompt | null } | undefined
			>;
			return storage[name]?.promptMath ?? null;
		}

		it('configure 로 넣은 훅이 storage 에 실린다', () => {
			const promptMath: MathPrompt = async () => null;
			createEditor('<p></p>', promptMath);
			expect(storedPrompt(editor, 'math_inline')).toBe(promptMath);
			expect(storedPrompt(editor, 'math_display')).toBe(promptMath);
		});

		it('훅을 안 주면 null 이다 (window.prompt 로 떨어지는 경로)', () => {
			createEditor('<p></p>');
			expect(storedPrompt(editor, 'math_inline')).toBeNull();
			expect(storedPrompt(editor, 'math_display')).toBeNull();
		});

		it('promptMathDisplay 가 돌려준 LaTeX 로 노드를 만든다', async () => {
			const seen: Array<[string, boolean]> = [];
			createEditor('<p></p>', async (latex, displayMode) => {
				seen.push([latex, displayMode]);
				return 'E = mc^2';
			});

			expect(editor.commands.promptMathDisplay()).toBe(true);
			await flush();

			expect(seen).toEqual([['', true]]);
			const display = json().content?.[0];
			expect(display?.type).toBe('math_display');
			expect(display?.content?.[0]?.text).toBe('E = mc^2');
		});

		it('promptMathInline 은 displayMode=false 로 부르고 인라인 노드를 만든다', async () => {
			const seen: Array<[string, boolean]> = [];
			createEditor('<p></p>', async (latex, displayMode) => {
				seen.push([latex, displayMode]);
				return '  a^2  '; // 앞뒤 공백은 잘려야 한다
			});

			expect(editor.commands.promptMathInline()).toBe(true);
			await flush();

			expect(seen).toEqual([['', false]]);
			const inline = json().content?.[0]?.content?.[0];
			expect(inline?.type).toBe('math_inline');
			expect(inline?.content?.[0]?.text).toBe('a^2');
		});

		it('취소(null)면 아무것도 만들지 않는다', async () => {
			createEditor('<p></p>', async () => null);
			editor.commands.promptMathDisplay();
			await flush();
			expect(editor.getHTML()).toBe('<p></p>');

			editor.commands.promptMathInline();
			await flush();
			expect(editor.getHTML()).toBe('<p></p>');
		});

		it('빈 문자열·공백만 확인해도 노드를 만들지 않는다', async () => {
			createEditor('<p></p>', async () => '   ');
			editor.commands.promptMathDisplay();
			await flush();
			expect(editor.getHTML()).toBe('<p></p>');
		});
	});
});
