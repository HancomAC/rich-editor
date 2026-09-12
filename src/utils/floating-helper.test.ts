import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MathInline, MathDisplay, type MathPrompt } from "../extensions/Math";
import {
	isEmptyRootParagraph,
	floatingHelperVisible,
	helperInsertMath,
	helperInsertCodeBlock,
	FLOATING_HELPER_ON_CLASS,
} from "./floating-helper";

/*
 * 헬퍼의 계약 넷을 문서 상태로 확인한다 — 뜨는 자리(포커스된 최상위 빈 문단)에서만
 * 뜨고, 읽기 전용·비포커스·팝업 열림(suppressed)이면 안 뜨고, 슬래시·이모지 트리거
 * 텍스트가 있으면 (블록이 비지 않았으므로) 안 뜨고, 두 버튼은 슬래시 메뉴 항목과
 * 같은 결과를 만든다.
 */
describe("빈 줄 플로팅 헬퍼", () => {
	let editor: Editor;

	function createEditor(
		content = "<p></p>",
		opts: { editable?: boolean; promptMath?: MathPrompt } = {},
	) {
		editor = new Editor({
			element: document.createElement("div"),
			extensions: [
				StarterKit,
				opts.promptMath ? MathInline.configure({ promptMath: opts.promptMath }) : MathInline,
				opts.promptMath ? MathDisplay.configure({ promptMath: opts.promptMath }) : MathDisplay,
			],
			content,
			editable: opts.editable ?? true,
		});
		return editor;
	}

	afterEach(() => {
		editor?.destroy();
	});

	/** 포커스·비억제 기준의 최종 판정 — 개별 축은 아래에서 따로 끈다. */
	const shown = () => floatingHelperVisible(editor, { focused: true, suppressed: false });
	const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

	interface JSONNode {
		type?: string;
		text?: string;
		content?: JSONNode[];
	}
	function findNode(node: JSONNode, type: string): JSONNode | null {
		if (node.type === type) return node;
		for (const child of node.content ?? []) {
			const hit = findNode(child, type);
			if (hit) return hit;
		}
		return null;
	}
	const docJson = () => editor.getJSON() as unknown as JSONNode;

	describe("표시 조건", () => {
		it("포커스된 최상위 빈 문단이면 뜬다", () => {
			createEditor("<p></p>");
			expect(shown()).toBe(true);
		});

		it("문서 끝의 빈 문단에서도 뜬다 (첫 줄 한정이 아니다)", () => {
			createEditor("<p>내용</p><p></p>");
			editor.commands.setTextSelection(editor.state.doc.content.size - 1);
			expect(shown()).toBe(true);
		});

		it("글자가 있으면 안 뜬다", () => {
			createEditor("<p>안녕</p>");
			expect(shown()).toBe(false);
		});

		it("빈 제목에서는 안 뜬다 — '제목 N' placeholder 몫 (main 과 의도적 차이)", () => {
			createEditor("<h1></h1>");
			expect(shown()).toBe(false);
		});

		it("코드블록 안 빈 줄에서는 안 뜬다", () => {
			createEditor("<pre><code></code></pre>");
			expect(shown()).toBe(false);
		});

		it("중첩 블록(인용문) 안의 빈 문단에서는 안 뜬다 — 최상위 깊이 한정", () => {
			createEditor("<blockquote><p></p></blockquote>");
			expect(editor.state.selection.$anchor.depth).toBeGreaterThan(1);
			expect(shown()).toBe(false);
		});

		it("노드 선택(커서가 접혀 있지 않음)이면 안 뜬다", () => {
			createEditor("<p></p><hr>");
			editor.commands.setNodeSelection(2);
			expect(shown()).toBe(false);
		});

		it("isEmptyRootParagraph 는 텍스트만이 아니라 내용 유무를 본다", () => {
			// hardBreak 는 textContent 가 "" 지만 빈 줄이 아니다 — tiptap 기본
			// shouldShow(textContent 검사)와 달리 content.size 로 걸러진다.
			createEditor("<p><br></p>");
			expect(isEmptyRootParagraph(editor.state)).toBe(false);
		});
	});

	describe("표시 게이트", () => {
		it("읽기 전용이면 절대 안 뜬다", () => {
			createEditor("<p></p>", { editable: false });
			expect(floatingHelperVisible(editor, { focused: true, suppressed: false })).toBe(false);
		});

		it("포커스가 없으면 안 뜬다", () => {
			createEditor("<p></p>");
			expect(floatingHelperVisible(editor, { focused: false, suppressed: false })).toBe(false);
		});

		it("suppressed(슬래시·이모지 메뉴 열림)면 안 뜬다", () => {
			createEditor("<p></p>");
			expect(floatingHelperVisible(editor, { focused: true, suppressed: true })).toBe(false);
		});

		it("슬래시 트리거 텍스트(/)가 있으면 블록이 비지 않아 안 뜬다", () => {
			createEditor("<p>/</p>");
			editor.commands.setTextSelection(2);
			expect(shown()).toBe(false);
		});

		it("이모지 트리거 텍스트(:sm)가 있으면 블록이 비지 않아 안 뜬다", () => {
			createEditor("<p>:sm</p>");
			editor.commands.setTextSelection(4);
			expect(shown()).toBe(false);
		});
	});

	describe("버튼 커맨드", () => {
		it("수식 — 프롬프트가 돌려준 LaTeX 로 수식 블록을 넣는다 (슬래시 '수식' 과 동일)", async () => {
			createEditor("<p></p>", { promptMath: async () => "a^2" });
			expect(helperInsertMath(editor)).toBe(true);
			await flush();
			const math = findNode(docJson(), "math_display");
			expect(math).not.toBeNull();
			expect(math!.content?.[0]?.text).toBe("a^2");
		});

		it("수식 — 프롬프트를 취소하면 아무것도 넣지 않는다", async () => {
			createEditor("<p></p>", { promptMath: async () => null });
			helperInsertMath(editor);
			await flush();
			expect(findNode(docJson(), "math_display")).toBeNull();
			expect(findNode(docJson(), "math_inline")).toBeNull();
		});

		it("코드 — 현재 빈 문단을 코드블록으로 바꾼다 (슬래시 '코드' 와 동일)", () => {
			createEditor("<p></p>");
			expect(helperInsertCodeBlock(editor)).toBe(true);
			expect(editor.state.doc.firstChild?.type.name).toBe("codeBlock");
		});
	});

	describe("placeholder 겹침 계약", () => {
		it("editor.css 에 숨김 규칙이 클래스 상수와 같은 이름으로 있다", () => {
			// 컴포넌트는 이 클래스를 `.tiptap` 에 토글하고, CSS 가 그 동안 placeholder 를
			// 숨긴다. 이름이 갈리면 문구가 겹쳐도 아무 테스트도 안 깨지므로 여기서 묶는다.
			// happy-dom 에서는 `import.meta.url` 이 http 스킴이라 파일 경로로 못 쓴다 —
			// vitest 는 패키지 루트에서 돌므로 cwd 기준으로 읽는다.
			const css = readFileSync(join(process.cwd(), "src/styles/editor.css"), "utf8");
			expect(css).toContain(`.tiptap.${FLOATING_HELPER_ON_CLASS} .is-empty::before`);
		});
	});
});
