import { Node, mergeAttributes } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
// ⚠️ `MutationRecord` 가 아니다. ProseMirror 는 `{ type: "selection" }` 이라는 가짜 기록도
//    같은 자리로 흘려보내서, DOM 타입만 받으면 시그니처가 맞지 않는다.
import type { ViewMutationRecord } from "@tiptap/pm/view";

/**
 * 탭 블록 — 한 상자 안의 내용을 **탭으로 나눠** 한 번에 하나만 보여준다(노션의 그것).
 *
 * ## 구조는 `Columns` 를, 조작은 `CardBlock` 을 본떴다
 *
 * - **노드 두 개 쌍**(`tabs` 컨테이너 + `tab` 자식)은 `Columns`/`Column` 과 같은 모양이다.
 *   `tab` 은 `group: ""` 이라 혼자서는 어디에도 못 들어간다 — 반드시 `tabs` 안이다.
 * - **NodeView 는 vanilla JS**, 컨트롤에 `data-tab-control` 을 달고 `stopEvent` 로
 *   ProseMirror 에게서 이벤트를 뺏는 것은 `CardBlock` 과 같은 방식이다
 *   (이 패키지의 NodeView 는 Svelte 를 쓰지 않는다 — `.claude/rules/rich-editor.md`).
 *
 * ## 활성 탭은 저장하지 않는다
 *
 * 지금 몇 번 탭을 보고 있는지는 **보는 사람의 화면 상태**지 문서의 내용이 아니다. 저장하면
 * 내가 열어 둔 탭이 남의 문서에 박힌다. 그래서 NodeView 의 지역 변수로만 들고, 문서를 새로
 * 열면 **언제나 첫 탭**이다.
 *
 * ## 저장 형식
 *
 * ```html
 * <div data-type="tabs">
 *   <div data-type="tab" data-tab-title="탭 1"><p>…</p></div>
 *   <div data-type="tab" data-tab-title="탭 2"><p>…</p></div>
 * </div>
 * ```
 *
 * ⚠️ `data-tab-title` 은 `utils/sanitize.ts` 의 `ALLOWED_ATTRS.div` 에 **반드시** 있어야 한다.
 * 빠지면 살균을 거칠 때 제목만 조용히 사라져 탭 이름이 전부 `탭 1`·`탭 2` 로 되돌아간다.
 *
 * ⚠️ 정적(살균) 렌더에는 탭바가 없다. 그때는 CSS 가 첫 탭만 남기고 나머지를 감춘다
 * (`editor.css` 의 `:not(.hce-tabs-live)` 규칙). 그래야 에디터가 서기 전후로 높이가 튀지 않는다.
 */

/** 이름을 따로 주지 않은 탭이 보여줄 기본 이름. */
const defaultTitle = (index: number) => `탭 ${index + 1}`;

/**
 * 여기까지는 **클릭이다.** 손가락·마우스는 누를 때 몇 px 씩 흔들리므로, 이만큼 넘어야
 * "끌었다"로 본다. 넘지 않고 떼면 평소대로 탭 전환이 되고 두 번 누르면 이름 고치기가 뜬다.
 */
const DRAG_THRESHOLD = 5;

/**
 * 클래스 값이 이미 원하는 상태면 **손대지 않는다.**
 *
 * ⚠️ `contentDOM` 안의 요소에 class 를 다시 쓰면 값이 같아도 ProseMirror 의 MutationObserver
 * 가 깨어나 그 구간을 통째로 다시 읽는다. `classList.toggle(x, false)` 는 원래 없던 클래스에도
 * 속성 쓰기를 일으키므로, 실제로 바뀔 때만 건드린다.
 */
const toggleClass = (el: Element, cls: string, on: boolean) => {
	if (el.classList.contains(cls) === on) return;
	el.classList.toggle(cls, on);
};

/**
 * 탭 하나. `tabs` 안에서만 산다(`group: ""`).
 *
 * `isolating: true` — 탭 경계 너머로 지우기·병합이 넘어가지 않게 한다. 없으면 탭 맨 앞에서
 * Backspace 를 눌렀을 때 앞 탭의 내용과 합쳐진다.
 */
export const Tab = Node.create({
	name: "tab",
	group: "",
	content: "block+",
	isolating: true,

	addAttributes() {
		return {
			title: {
				default: "",
				parseHTML: (el) => el.getAttribute("data-tab-title") ?? "",
				// 비어 있으면 속성을 안 쓴다(표시할 때 `탭 N` 로 떨어진다). `CardBlock` 과 같은 방식.
				renderHTML: (attrs) =>
					attrs.title ? { "data-tab-title": attrs.title as string } : {}
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="tab"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tab" }), 0];
	},

	/**
	 * ⚠️ **이 NodeView 가 하는 일은 딱 하나 — `ignoreMutation` 이다. 빼면 무한 루프가 돈다.**
	 *
	 * 활성 표시(`hce-tab-active`)는 `tabs` NodeView 가 **밖에서** 이 요소에 붙인다. 그런데 이
	 * 요소는 `tabs` 의 `contentDOM` **안**이라 ProseMirror 가 소유한다. 기본 동작에서는 class
	 * 속성이 바뀌는 것을 "문서가 손으로 고쳐졌다"로 읽고 이 자리를 다시 그리는데, 다시 그리면
	 * 요소가 새로 만들어져 클래스가 사라지고 → 우리가 또 붙이고 → 또 다시 그리고…
	 * 가 끝없이 돈다.
	 *
	 * 실측: 이 훅이 없으면 탭이 든 문서를 열자마자 ProseMirror 가 자식 요소를 계속 갈아치워
	 * **활성 클래스가 어디에도 남지 않고**(화면에 아무 탭도 안 보인다), happy-dom 에서는
	 * 매크로태스크를 한 번만 흘려도 테스트가 통째로 멈췄다.
	 *
	 * `tab` 은 DOM 속성으로 관찰해야 할 것이 없으므로(제목은 노드 attr 로 관리한다)
	 * 속성 변화는 전부 무시해도 안전하다.
	 */
	addNodeView() {
		return () => {
			const dom = document.createElement("div");
			dom.setAttribute("data-type", "tab");
			return {
				dom,
				contentDOM: dom,
				ignoreMutation: (mutation: ViewMutationRecord) => mutation.type === "attributes"
			};
		};
	}
});

export const TabsBlock = Node.create({
	name: "tabs",
	group: "block",
	content: "tab+",
	defining: true,
	draggable: true,

	parseHTML() {
		return [{ tag: 'div[data-type="tabs"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tabs" }), 0];
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			let currentNode = node;
			/** 지금 보고 있는 탭. 문서에 저장하지 않는다(파일 첫머리 주석 참고). */
			let active = 0;
			/** 이름을 고치는 중인 탭. 이 동안에는 탭바를 다시 그리지 않는다(입력칸이 날아간다). */
			let renaming: number | null = null;
			/**
			 * 끌고 있는 칩. `renaming` 과 같은 이유로 **이 동안에도 탭바를 다시 그리지 않는다** —
			 * 다시 그리면 끌던 칩이 통째로 사라진다.
			 *
			 * `moved` 는 임계값을 넘겼는지다. 안 넘겼으면 드래그가 아니라 그냥 클릭이다.
			 * `drop` 은 "몇 번째 **앞**에 넣을지"(0…childCount). -1 이면 탭바 밖 = 취소.
			 */
			let dragging: {
				index: number;
				chip: HTMLElement;
				pointerId: number;
				startX: number;
				startY: number;
				moved: boolean;
				drop: number;
			} | null = null;
			/** 드래그로 끝난 포인터가 뒤이어 흘리는 `click` 을 한 번 삼킨다. */
			let swallowClick = false;
			/** 마지막으로 그린 탭바의 내용. 같으면 다시 그리지 않는다. */
			let lastSignature = "";

			const dom = document.createElement("div");
			dom.setAttribute("data-type", "tabs");
			dom.setAttribute("data-node-view-wrapper", "");
			// ⚠️ `hce-tabs-live` 는 CSS 의 정적 폴백을 끄는 스위치다(`editor.css` 주석 참고).
			dom.className = "hce-tabs hce-tabs-live";

			/*
			 * ⚠️ **탭바는 `contentDOM` 바깥이다.** 안에 넣으면 ProseMirror 가 칩과 버튼을
			 * 노드의 내용으로 읽어 문서에 섞어 넣는다(그리고 지울 수도 없게 된다).
			 */
			const bar = document.createElement("div");
			bar.className = "hce-tabs-bar";
			bar.contentEditable = "false";
			// `stopEvent` 가 이 표시를 보고 이벤트를 가로챈다. `CardBlock` 의 `data-card-control` 과 같다.
			bar.setAttribute("data-tab-control", "");
			dom.appendChild(bar);

			const panels = document.createElement("div");
			panels.className = "hce-tabs-panels";
			dom.appendChild(panels);

			/**
			 * 탭바를 다시 그려야 하는지 판단하는 값 — 개수·이름·편집 가능 여부가 전부다.
			 *
			 * ⚠️ 이름 사이를 **탭 문자**로 끊는다. 그냥 이어 붙이면 ["ab","c"] 와 ["a","bc"] 가
			 *    같은 값이 되어 이름 변경을 놓친다(탭 이름에는 탭 문자가 못 들어간다).
			 * ⚠️ `isEditable` 도 넣는다. 호스트가 도중에 읽기↔편집을 뒤집으면 문서는 그대로라,
			 *    이 값이 없으면 `+`·`×` 가 나타나거나 사라지지 않는다.
			 */
			const signature = (n: typeof node) => {
				const titles: string[] = [];
				n.forEach((child) => titles.push(String(child.attrs.title ?? "")));
				return `${editor.isEditable ? "w" : "r"}	${n.childCount}	${titles.join("	")}`;
			};

			const titleOf = (index: number) => {
				const raw = String(currentNode.child(index).attrs.title ?? "").trim();
				return raw || defaultTitle(index);
			};

			/** `index` 번째 탭 노드의 문서상 위치. `tabs` 가 문서에서 빠졌으면 null. */
			const childPos = (index: number): number | null => {
				const base = getPos();
				if (base == null) return null;
				let pos = base + 1;
				for (let i = 0; i < index; i++) pos += currentNode.child(i).nodeSize;
				return pos;
			};

			/** 활성 표시를 DOM 에 반영한다. */
			const applyActive = () => {
				for (let i = 0; i < panels.children.length; i++) {
					toggleClass(panels.children[i], "hce-tab-active", i === active);
				}
				const chips = bar.querySelectorAll(".hce-tab-chip");
				for (let i = 0; i < chips.length; i++) {
					toggleClass(chips[i], "is-active", i === active);
				}
			};

			/**
			 * ⚠️ **활성 표시는 두 번 붙여야 한다. 한 번으로는 조용히 빠진다.**
			 *
			 * ProseMirror 의 `CustomNodeViewDesc.update()` 는 우리 `update()` 를 **먼저** 부르고
			 * 그 다음에 `contentDOM` 의 자식을 다시 그린다. 그래서 그 자리에서 붙인 클래스는
			 * 곧이어 새로 만들어지는 자식 DOM 과 함께 사라진다 — 실측으로 탭을 하나 추가하면
			 * **어느 패널에도 클래스가 없는**(`-1`) 상태가 됐다. 자식이 다 그려진 뒤(같은
			 * 프레임의 마이크로태스크)에 한 번 더 붙인다. 눈에 보이는 지연은 없다.
			 *
			 * (다시 그려도 클래스가 **한 번만에 안착**하는 것은 `Tab` 의 `ignoreMutation` 덕이다.
			 *  그게 없으면 여기서 붙인 클래스가 다시 그리기를 부르고 끝없이 맴돈다 — 그쪽 주석 참고.)
			 */
			const scheduleApplyActive = () => {
				applyActive();
				queueMicrotask(applyActive);
			};

			/**
			 * 커서를 지금 활성 탭 안으로 옮긴다.
			 *
			 * ⚠️ **`view.dispatch` + `view.focus()` 로는 부족했다.** 탭을 감추면 브라우저가
			 * DOM 선택을 제멋대로 옮기고, 그 뒤늦은 `selectionchange` 를 ProseMirror 가 읽어
			 * 방금 넣은 선택을 덮어썼다 — 실측 증상은 **탭을 바꾼 뒤 첫 글자만 이전 탭에
			 * 들어가는 것**이었다(1초를 기다려도 재현). TipTap 의 `focus` 커맨드는 다음 프레임에
			 * `view.focus()` 를 한 번 더 걸어 DOM 선택을 다시 못박으므로 그걸 쓴다.
			 */
			const focusActiveTab = () => {
				if (!editor.isEditable) return;
				const base = getPos();
				if (base == null) return;
				const { state } = editor.view;
				const { from } = state.selection;
				// 커서가 이 탭 블록 밖이면 건드리지 않는다 — 탭을 눌렀다고 남의 자리를 뺏지 않는다.
				if (from <= base || from >= base + currentNode.nodeSize) return;
				const start = childPos(active);
				if (start == null) return;
				const end = start + currentNode.child(active).nodeSize;
				// 이미 활성 탭 안이면 그대로 둔다.
				if (from > start && from < end) return;
				try {
					// `focus(pos)` 는 `TextSelection.create` 를 쓰므로 **인라인 자리**를 줘야 한다.
					const target = Selection.near(state.doc.resolve(start + 1), 1).from;
					editor.commands.focus(target);
				} catch {
					// 위치가 어긋난 프레임 — 표시 전환은 이미 끝났으니 커서는 그냥 둔다.
				}
			};

			const setActive = (index: number) => {
				if (index < 0 || index >= currentNode.childCount) return;
				if (index === active) return;
				const previous = active;
				active = index;
				/*
				 * ⚠️ **보이게 → 옮기기 → 감추기** 순서를 지킨다.
				 * 감추기를 먼저 하면 커서가 `display: none` 안에 갇힌 채로 선택을 옮기게 되고,
				 * 브라우저는 안 보이는 곳에 캐럿을 놓지 못해 DOM 선택이 이전 탭에 남는다.
				 * 새 탭을 먼저 보이게 해 두면 옮길 자리가 이미 화면에 있다.
				 */
				const target = panels.children[index];
				if (target) toggleClass(target, "hce-tab-active", true);
				focusActiveTab();
				const gone = panels.children[previous];
				if (gone) toggleClass(gone, "hce-tab-active", false);
				scheduleApplyActive();
			};

			const setTitle = (index: number, title: string) => {
				const pos = childPos(index);
				if (pos == null) return;
				const child = currentNode.child(index);
				if (String(child.attrs.title ?? "") === title) return;
				editor.view.dispatch(
					editor.view.state.tr.setNodeMarkup(pos, undefined, {
						...child.attrs,
						title
					})
				);
			};

			const addTab = () => {
				const base = getPos();
				if (base == null) return;
				const type = editor.schema.nodes.tab;
				if (!type) return;
				const index = currentNode.childCount;
				// `content: "block+"` 이라 `createAndFill` 이 빈 문단 하나를 채워 준다.
				const created = type.createAndFill({ title: defaultTitle(index) });
				if (!created) return;
				active = index;
				// `tabs` 가 닫히기 직전 = 마지막 탭 뒤.
				editor.view.dispatch(
					editor.view.state.tr.insert(base + currentNode.nodeSize - 1, created)
				);
			};

			const removeTab = (index: number) => {
				// ⚠️ 마지막 한 개는 못 지운다 — `content: "tab+"` 이라 빈 탭 블록은 스키마 위반이다.
				if (currentNode.childCount <= 1) return;
				const from = childPos(index);
				if (from == null) return;
				const to = from + currentNode.child(index).nodeSize;
				// 지운 자리를 메우는 탭을 그대로 본다. 마지막을 지웠으면 한 칸 앞으로.
				if (index < active || active >= currentNode.childCount - 1) {
					active = Math.max(0, active - 1);
				}
				editor.view.dispatch(editor.view.state.tr.delete(from, to));
			};

			/**
			 * 탭 하나를 `to` **앞**으로 옮긴다(`to` 는 0…childCount, 옮기기 **전** 기준).
			 *
			 * ⚠️ 제목만 바꿔치기하지 않는다 — 노드를 통째로 들어 옮기므로 **내용이 같이 간다.**
			 * ⚠️ 트랜잭션 **하나**로 뺐다 넣는다. 두 번 dispatch 하면 되돌리기가 두 번 걸리고,
			 *    중간 상태에서 `update()` 가 한 번 더 돌아 탭바가 헛돈다.
			 */
			const moveTab = (from: number, to: number) => {
				// 제자리(자기 앞·자기 뒤)면 아무 일도 없다.
				if (to === from || to === from + 1) return;
				if (from < 0 || from >= currentNode.childCount) return;
				if (to < 0 || to > currentNode.childCount) return;
				const fromPos = childPos(from);
				const toPos = childPos(to);
				if (fromPos == null || toPos == null) return;
				const moved = currentNode.child(from);
				remapActive(from, to);
				const tr = editor.view.state.tr;
				tr.delete(fromPos, fromPos + moved.nodeSize);
				// 뒤쪽 좌표는 삭제만큼 당겨진다 — 매핑을 태워야 자리가 맞는다.
				tr.insert(tr.mapping.map(toPos), moved);
				editor.view.dispatch(tr);
			};

			/**
			 * 옮긴 뒤에도 **보고 있던 그 탭**을 계속 본다. 인덱스가 아니라 노드를 따라간다.
			 *
			 * 옮긴 뒤 그 노드가 앉는 자리는 `to > from ? to - 1 : to`. 나머지는 두 단계로 센다 —
			 * ① 뺀 자리보다 뒤였으면 한 칸 당겨지고 ② 넣는 자리 이후면 한 칸 밀린다.
			 */
			const remapActive = (from: number, to: number) => {
				const landed = to > from ? to - 1 : to;
				if (active === from) {
					active = landed;
					return;
				}
				let next = active > from ? active - 1 : active;
				if (next >= landed) next += 1;
				active = next;
			};

			/** 지금 포인터 위치가 "몇 번째 앞"인지. 탭바 밖이면 -1(취소). */
			const dropIndexAt = (x: number, y: number): number => {
				const rect = bar.getBoundingClientRect();
				// 탭바 언저리까지는 봐 준다 — 경계에서 손이 조금 흔들렸다고 취소되면 답답하다.
				const slack = 24;
				if (
					x < rect.left - slack ||
					x > rect.right + slack ||
					y < rect.top - slack ||
					y > rect.bottom + slack
				) {
					return -1;
				}
				const list = bar.querySelectorAll(".hce-tab-chip");
				for (let i = 0; i < list.length; i++) {
					const r = list[i].getBoundingClientRect();
					if (x < r.left + r.width / 2) return i;
				}
				return list.length;
			};

			/** 드롭될 자리를 칩 사이의 세로 선으로 보여 준다. */
			const markDrop = (drop: number) => {
				const list = bar.querySelectorAll(".hce-tab-chip");
				for (let i = 0; i < list.length; i++) {
					toggleClass(list[i], "is-drop-before", drop === i);
					toggleClass(list[i], "is-drop-after", drop === list.length && i === list.length - 1);
				}
			};

			/**
			 * 드래그 중 Esc. 손은 버튼을 누르고 있어 키가 칩에 오지 않으므로 **문서에** 건다.
			 * 드래그가 끝나면 반드시 뗀다(`endDrag`).
			 */
			const onEscape = (e: KeyboardEvent) => {
				if (e.key !== "Escape" || !dragging) return;
				e.preventDefault();
				e.stopPropagation();
				endDrag(false);
			};

			const endDrag = (commit: boolean) => {
				const state = dragging;
				if (!state) return;
				dragging = null;
				document.removeEventListener("keydown", onEscape, true);
				// ⚠️ 드래그 동안 꺼 뒀던 것을 되돌린다(이름 고치기와 같은 이유).
				dom.draggable = true;
				bar.classList.remove("is-dragging");
				state.chip.classList.remove("is-dragged");
				markDrop(-1);
				try {
					state.chip.releasePointerCapture(state.pointerId);
				} catch {
					// 이미 놓였거나 캡처를 못 잡은 포인터 — 무시해도 된다.
				}
				// 임계값을 못 넘겼으면 드래그가 아니다. 뒤따르는 click 이 탭 전환을 한다.
				if (!state.moved) return;
				swallowClick = true;
				if (!commit || state.drop < 0) return;
				moveTab(state.index, state.drop);
			};

			/** 칩을 두 번 누르면 그 자리에서 이름을 고친다. */
			const startRename = (index: number, chip: HTMLElement, label: HTMLElement) => {
				if (renaming !== null) return;
				renaming = index;

				const input = document.createElement("input");
				input.type = "text";
				input.className = "hce-tab-title-input";
				input.value = titleOf(index);
				input.setAttribute("data-tab-control", "");

				let done = false;
				const finish = (commit: boolean) => {
					if (done) return;
					done = true;
					renaming = null;
					dom.draggable = true;
					const next = input.value.trim();
					input.replaceWith(label);
					if (commit) setTitle(index, next);
				};

				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						finish(true);
					} else if (e.key === "Escape") {
						e.preventDefault();
						finish(false);
					}
				});
				input.addEventListener("blur", () => finish(true));
				/*
				 * ⚠️ 이 노드는 `draggable` 이라 ProseMirror 가 바깥 상자에 `draggable="true"` 를
				 * 건다. 그 안의 입력칸은 크롬에서 **드래그로 글자를 고를 수 없다** — 고치는 동안만
				 * 끈다(위 `finish` 에서 되돌린다).
				 */
				input.addEventListener("mousedown", () => {
					dom.draggable = false;
				});

				chip.replaceChild(input, label);
				input.focus();
				input.select();
			};

			const renderBar = () => {
				bar.replaceChildren();
				const editable = editor.isEditable;

				for (let i = 0; i < currentNode.childCount; i++) {
					const index = i;
					const chip = document.createElement("div");
					chip.className = "hce-tab-chip";

					/*
					 * ── 끌어서 순서 바꾸기 ──────────────────────────────────────────
					 * ⚠️ **HTML5 드래그(`dragstart`/`drop`)를 쓰지 않는다.** 이 노드는
					 *    `draggable: true` 라 ProseMirror 가 바깥 상자에 `draggable="true"` 를
					 *    걸어 두는데, 그러면 칩을 끄는 순간 블록 통째로 끌기가 먼저 잡아챈다
					 *    (이름 입력칸에서 `dom.draggable = false` 우회를 해야 했던 그 문제).
					 *    포인터 이벤트로 직접 그린다.
					 */
					if (editable) {
						chip.addEventListener("pointerdown", (e) => {
							if (e.button !== 0 || renaming !== null || dragging) return;
							const hit = e.target;
							// ×(삭제) 위에서 시작한 것은 드래그가 아니다.
							if (hit instanceof Element && hit.closest(".hce-tab-chip-close")) return;
							swallowClick = false;
							dragging = {
								index,
								chip,
								pointerId: e.pointerId,
								startX: e.clientX,
								startY: e.clientY,
								moved: false,
								drop: index
							};
							try {
								chip.setPointerCapture(e.pointerId);
							} catch {
								// 캡처를 못 잡아도 아래 move/up 리스너가 칩 위에 있으니 굴러간다.
							}
							document.addEventListener("keydown", onEscape, true);
						});

						chip.addEventListener("pointermove", (e) => {
							if (!dragging || dragging.pointerId !== e.pointerId) return;
							if (!dragging.moved) {
								// ⚠️ 임계값 전에는 드래그가 아니다 — 넘지 않고 떼면 전환 클릭이 살아야 한다.
								const dx = Math.abs(e.clientX - dragging.startX);
								const dy = Math.abs(e.clientY - dragging.startY);
								if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
								dragging.moved = true;
								// 끄는 동안에는 블록 통째로 끌기를 꺼 둔다.
								dom.draggable = false;
								bar.classList.add("is-dragging");
								chip.classList.add("is-dragged");
							}
							e.preventDefault();
							dragging.drop = dropIndexAt(e.clientX, e.clientY);
							markDrop(dragging.drop);
						});

						chip.addEventListener("pointerup", () => endDrag(true));
						chip.addEventListener("pointercancel", () => endDrag(false));
					}

					const label = document.createElement("button");
					label.type = "button";
					label.className = "hce-tab-chip-label";
					label.textContent = titleOf(index);
					// 누르는 순간 에디터의 선택이 튀지 않게 한다(전환 판단은 `focusActiveTab` 이 한다).
					label.addEventListener("mousedown", (e) => e.preventDefault());
					label.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						// 방금 끌어서 옮긴 거라면 전환하지 않는다.
						if (swallowClick) {
							swallowClick = false;
							return;
						}
						setActive(index);
					});
					if (editable) {
						label.title = "두 번 누르면 이름을 고칩니다";
						label.addEventListener("dblclick", (e) => {
							e.preventDefault();
							e.stopPropagation();
							startRename(index, chip, label);
						});
					}
					chip.appendChild(label);

					/*
					 * 읽기 모드에는 삭제가 없다.
					 *
					 * ⚠️ 편집 모드에서는 **마지막 한 개일 때도 자리는 그대로 만든다.** 예전엔
					 * `display: none` 으로 감췄다가 호버할 때 나타나게 했는데, 그때마다 칩 폭이
					 * 늘어 **`+` 와 뒤쪽 칩이 커서 밑에서 옆으로 밀렸다**(실측: 겨냥한 `+` 가
					 * 18px 옮겨져 클릭이 빗나갔다). 지금은 늘 자리를 차지하고 `visibility` 로만
					 * 보였다 안 보였다 한다 — 지울 수 없는 칩은 `is-disabled` 로 영영 감춘다.
					 */
					if (editable) {
						const deletable = currentNode.childCount > 1;
						const close = document.createElement("button");
						close.type = "button";
						close.className = deletable
							? "hce-tab-chip-close"
							: "hce-tab-chip-close is-disabled";
						close.setAttribute("aria-label", `${titleOf(index)} 삭제`);
						close.textContent = "×";
						if (deletable) {
							close.addEventListener("mousedown", (e) => e.preventDefault());
							close.addEventListener("click", (e) => {
								e.preventDefault();
								e.stopPropagation();
								removeTab(index);
							});
						} else {
							close.disabled = true;
							close.tabIndex = -1;
							close.setAttribute("aria-hidden", "true");
						}
						chip.appendChild(close);
					}

					bar.appendChild(chip);
				}

				if (editable) {
					const add = document.createElement("button");
					add.type = "button";
					add.className = "hce-tabs-add";
					add.setAttribute("aria-label", "탭 추가");
					add.title = "탭 추가";
					add.textContent = "+";
					add.addEventListener("mousedown", (e) => e.preventDefault());
					add.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						addTab();
					});
					bar.appendChild(add);
				}
			};

			lastSignature = signature(node);
			renderBar();
			/*
			 * ⚠️ 지금은 `panels` 가 **비어 있다.** ProseMirror 는 이 함수가 돌려준 뒤에야
			 * `contentDOM` 을 채우므로, 첫 활성 표시는 그 다음 마이크로태스크에서 붙는다
			 * (같은 프레임 안이라 화면에는 깜빡임이 없다).
			 */
			scheduleApplyActive();

			return {
				dom,
				contentDOM: panels,
				update: (updated) => {
					if (updated.type.name !== "tabs") return false;
					currentNode = updated;
					// 탭이 줄었으면 인덱스를 범위 안으로 당긴다.
					if (active >= updated.childCount) {
						active = Math.max(0, updated.childCount - 1);
					}
					const next = signature(updated);
					// ⚠️ 이름을 고치는 중이거나 칩을 끄는 중이면 다시 그리지 않는다 —
					//    그리는 순간 입력칸이나 끌던 칩이 통째로 사라진다.
					if (renaming === null && dragging === null && next !== lastSignature) {
						lastSignature = next;
						renderBar();
					}
					scheduleApplyActive();
					return true;
				},
				destroy: () => {
					// 드래그 도중에 노드가 사라질 수 있다 — 문서에 건 Esc 리스너를 남기지 않는다.
					document.removeEventListener("keydown", onEscape, true);
				},
				// 탭바 위의 이벤트는 ProseMirror 가 가로채면 안 된다.
				stopEvent: (event: Event) => {
					const target = event.target;
					return target instanceof Element && !!target.closest("[data-tab-control]");
				},
				/*
				 * ⚠️ 탭바는 우리가 직접 짓고 부수는 DOM 이다. 여기서 걸러 내지 않으면 칩 하나를
				 * 그릴 때마다 ProseMirror 가 "문서가 바뀌었나" 하고 이 구간을 다시 읽는다.
				 */
				ignoreMutation: (mutation: ViewMutationRecord) => {
					if (!panels.contains(mutation.target)) return true;
					// 활성 표시 클래스는 우리가 붙였다 뗀 것이지 문서의 변화가 아니다.
					return (
						mutation.type === "attributes" && mutation.attributeName === "class"
					);
				}
			};
		};
	},

	addCommands() {
		return {
			setTabs:
				(count = 3) =>
				({ chain }) => {
					const total = Math.max(1, Math.floor(count));
					return (
						chain()
							.insertContent({
								type: this.name,
								content: Array.from({ length: total }, (_unused, i) => ({
									type: "tab",
									attrs: { title: defaultTitle(i) },
									content: [{ type: "paragraph" }]
								}))
							})
							/*
							 * ⚠️ **커서를 첫 탭 안에 넣어 준다.** `insertContent` 가 놓아 주는 자리는
							 * 마지막 탭(또는 블록 뒤 문단)인데, 화면에 보이는 것은 첫 탭이라
							 * 만들자마자 글자를 치면 **세 탭이 전부 빈 채로 남고 글자는 엉뚱한
							 * 곳에 들어갔다**(실측). 넣은 `tabs` 를 찾아 첫 탭의 문단으로 옮긴다.
							 */
							.command(({ tr, dispatch }) => {
								if (!dispatch) return true;
								const at = tr.selection.from;
								let found = -1;
								tr.doc.nodesBetween(
									Math.max(0, at - 1),
									Math.min(tr.doc.content.size, at + 1),
									(candidate, pos) => {
										if (found === -1 && candidate.type.name === "tabs") found = pos;
										return found === -1;
									}
								);
								if (found === -1) return true;
								try {
									// `found + 1` = 첫 탭의 시작. `near(…, 1)` 이 그 안 첫 글자 자리를 찾는다.
									tr.setSelection(Selection.near(tr.doc.resolve(found + 1), 1));
								} catch {
									// 자리를 못 찾으면 `insertContent` 가 놓은 곳에 그대로 둔다.
								}
								return true;
							})
							.run()
					);
				}
		};
	}
});

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		tabs: {
			/** 탭 블록을 넣는다. 탭마다 빈 문단 하나. 기본 3개. */
			setTabs: (count?: number) => ReturnType;
		};
	}
}
