import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TabsBlock, Tab } from "./TabsBlock";
import { sanitizeHtml } from "../utils/sanitize";
let editor = null;
let host = null;
/**
 * ⚠️ NodeView 를 함께 검사하므로 에디터를 **문서에 붙인다.** 떼어 놓은 `div` 에 세우면
 * 칩 클릭 같은 이벤트가 흐르지 않아 탭바 동작을 못 본다.
 */
const make = (content = "<p></p>", editable = true) => {
    host = document.createElement("div");
    document.body.appendChild(host);
    editor = new Editor({
        element: host,
        extensions: [StarterKit, TabsBlock, Tab],
        content,
        editable
    });
    return editor;
};
/** NodeView 가 만든 탭바. */
const bar = (e) => e.view.dom.querySelector(".hce-tabs-bar");
const chips = (e) => Array.from(bar(e).querySelectorAll(".hce-tab-chip"));
const labels = (e) => chips(e).map((chip) => chip.querySelector(".hce-tab-chip-label")?.textContent ?? "");
const click = (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const tabsNode = (e) => e.getJSON().content?.find((n) => n.type === "tabs");
/** 문서에 든 탭들의 제목(속성 그대로 — 기본값 대체 없음). */
const titles = (e) => (tabsNode(e)?.content ?? []).map((t) => String(t.attrs?.title ?? ""));
/** 탭마다 `[제목, 본문 글자]`. 어느 탭에 글이 들어갔는지 한눈에 보려고 쓴다. */
const titlesAndText = (e) => {
    const out = [];
    e.state.doc.forEach((node) => {
        if (node.type.name !== "tabs")
            return;
        node.forEach((tab) => out.push([String(tab.attrs.title ?? ""), tab.textContent]));
    });
    return out;
};
/*
 * ── 드래그용 가짜 좌표 ────────────────────────────────────────────────────
 * happy-dom 은 레이아웃을 하지 않아 `getBoundingClientRect()` 가 전부 0 이다.
 * 드롭 위치는 칩의 **중점**으로 정하므로, 칩마다 실제 화면과 같은 모양의 사각형을
 * 물려 준다: i 번째 칩이 `[i*100, i*100+90]`, 탭바는 `[0, 400]`.
 * ⚠️ `renderBar()` 가 칩을 새로 만들면 이 가짜 값도 날아간다 — 드래그 직전에 다시 건다.
 */
const CHIP_W = 90;
const CHIP_GAP = 100;
const rect = (left, right, top = 0, bottom = 30) => ({
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({})
});
const stubGeometry = (e) => {
    bar(e).getBoundingClientRect = () => rect(0, 400);
    chips(e).forEach((chip, i) => {
        chip.getBoundingClientRect = () => rect(i * CHIP_GAP, i * CHIP_GAP + CHIP_W);
    });
};
/** i 번째 칩의 가로 중앙 좌표. */
const chipCenter = (i) => i * CHIP_GAP + CHIP_W / 2;
const pointer = (el, type, x, y = 15, pointerId = 1) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId }));
/**
 * `from` 번째 칩을 `x` 로 끌어다 놓는다.
 * `commit=false` 면 Esc 로 취소한다.
 */
const drag = (e, from, x, y = 15, commit = true) => {
    stubGeometry(e);
    const chip = chips(e)[from];
    const startX = chipCenter(from);
    pointer(chip, "pointerdown", startX, y);
    pointer(chip, "pointermove", startX + 12, y);
    pointer(chip, "pointermove", x, y);
    if (commit) {
        pointer(chip, "pointerup", x, y);
    }
    else {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        pointer(chip, "pointerup", x, y);
    }
};
/*
 * ⚠️ **마이크로태스크 하나로는 부족하다.** ProseMirror 가 자식을 다 그린 뒤에 활성 표시가
 *    붙고, happy-dom 은 그 사이에 자기 작업을 태스크로 흘린다. 매크로태스크까지 비운다.
 *    (이 대기가 무한 루프를 잡아내는 그물이기도 하다 — ProseMirror 가 계속 다시 그리면
 *     여기서 테스트가 통째로 멈춘다. 실제로 그렇게 잡았다.)
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
/** 활성 표시가 붙은 칩·패널의 인덱스. 둘이 어긋나면 화면과 탭바가 딴소리를 한다. */
const activeIndexes = (e) => {
    const has = (list, cls) => list.findIndex((el) => el.classList.contains(cls));
    const panels = e.view.dom.querySelector(".hce-tabs-panels");
    return {
        chip: has(chips(e), "is-active"),
        panel: has(Array.from(panels?.children ?? []), "hce-tab-active")
    };
};
afterEach(() => {
    editor?.destroy();
    editor = null;
    host?.remove();
    host = null;
});
describe("TabsBlock — 스키마", () => {
    it("두 확장이 함께 등록된다", () => {
        const e = make();
        const names = e.extensionManager.extensions.map((x) => x.name);
        expect(names).toContain("tabs");
        expect(names).toContain("tab");
    });
    it("setTabs 는 기본 3개, 각 탭에 빈 문단 하나", () => {
        const e = make();
        e.commands.setTabs();
        const node = tabsNode(e);
        expect(node?.content).toHaveLength(3);
        expect(node?.content?.[0]?.type).toBe("tab");
        expect(node?.content?.[0]?.content?.[0]?.type).toBe("paragraph");
        expect(titles(e)).toEqual(["탭 1", "탭 2", "탭 3"]);
    });
    it("setTabs(count) 로 개수를 정한다", () => {
        const e = make();
        e.commands.setTabs(2);
        expect(titles(e)).toEqual(["탭 1", "탭 2"]);
    });
    it('div[data-type="tabs"] 저장본을 그대로 읽는다', () => {
        const e = make('<div data-type="tabs">' +
            '<div data-type="tab" data-tab-title="입력"><p>A</p></div>' +
            '<div data-type="tab" data-tab-title="출력"><p>B</p></div>' +
            "</div>");
        const node = tabsNode(e);
        expect(node?.content).toHaveLength(2);
        expect(titles(e)).toEqual(["입력", "출력"]);
    });
    it("HTML 라운드트립 — 다시 읽어도 같은 문서다", () => {
        const first = make();
        first.commands.setTabs(3);
        const html = first.getHTML();
        expect(html).toContain('data-type="tabs"');
        expect(html).toContain('data-type="tab"');
        expect(html).toContain('data-tab-title="탭 1"');
        const json = first.getJSON();
        first.destroy();
        host?.remove();
        const second = make(html);
        expect(second.getJSON()).toEqual(json);
    });
    it("⚠️ 살균이 data-tab-title 을 지우지 않는다", () => {
        const e = make();
        e.commands.setTabs(2);
        const clean = sanitizeHtml(e.getHTML());
        expect(clean).toContain('data-type="tabs"');
        expect(clean).toContain('data-tab-title="탭 1"');
        expect(clean).toContain('data-tab-title="탭 2"');
    });
});
describe("TabsBlock — 탭바(NodeView)", () => {
    it("탭 수만큼 칩을 그리고 첫 탭이 활성이다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        expect(labels(e)).toEqual(["탭 1", "탭 2", "탭 3"]);
        expect(chips(e)[0].classList.contains("is-active")).toBe(true);
        expect(chips(e)[1].classList.contains("is-active")).toBe(false);
    });
    it("칩을 누르면 활성 탭이 바뀐다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        click(chips(e)[2].querySelector(".hce-tab-chip-label"));
        expect(chips(e)[2].classList.contains("is-active")).toBe(true);
        expect(chips(e)[0].classList.contains("is-active")).toBe(false);
        // 활성 표시는 contentDOM 의 자식에도 붙는다.
        const panels = e.view.dom.querySelector(".hce-tabs-panels");
        expect(panels.children[2].classList.contains("hce-tab-active")).toBe(true);
    });
    it("+ 를 누르면 탭이 늘고 새 탭이 활성이 된다", async () => {
        const e = make();
        e.commands.setTabs(2);
        await flush();
        click(bar(e).querySelector(".hce-tabs-add"));
        expect(titles(e)).toEqual(["탭 1", "탭 2", "탭 3"]);
        expect(labels(e)).toHaveLength(3);
        expect(chips(e)[2].classList.contains("is-active")).toBe(true);
        // 새 탭에도 빈 문단이 하나 들어간다.
        const node = tabsNode(e);
        expect(node?.content?.[2]?.content?.[0]?.type).toBe("paragraph");
    });
    it("× 를 누르면 그 탭이 지워진다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        click(chips(e)[1].querySelector(".hce-tab-chip-close"));
        expect(titles(e)).toEqual(["탭 1", "탭 3"]);
        expect(labels(e)).toEqual(["탭 1", "탭 3"]);
    });
    it("⚠️ 마지막 한 개는 지울 수 없다 — 버튼은 자리만 지킨다", async () => {
        const e = make();
        e.commands.setTabs(2);
        await flush();
        click(chips(e)[0].querySelector(".hce-tab-chip-close"));
        expect(titles(e)).toHaveLength(1);
        /*
         * ⚠️ 버튼을 **없애지 않는다.** 없애면 칩 폭이 줄어 탭바가 옆으로 밀린다
         * (호버로 나타났다 사라지던 시절의 클릭 빗나감과 같은 원인).
         */
        const close = chips(e)[0].querySelector(".hce-tab-chip-close");
        expect(close).toBeTruthy();
        expect(close.classList.contains("is-disabled")).toBe(true);
        expect(close.disabled).toBe(true);
        click(close);
        expect(titles(e)).toHaveLength(1);
    });
    it("칩을 두 번 누르면 이름을 고칠 수 있다", async () => {
        const e = make();
        e.commands.setTabs(2);
        await flush();
        const label = chips(e)[0].querySelector(".hce-tab-chip-label");
        label.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
        const input = bar(e).querySelector(".hce-tab-title-input");
        expect(input).toBeTruthy();
        expect(input.value).toBe("탭 1");
        input.value = "입력 형식";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        expect(titles(e)).toEqual(["입력 형식", "탭 2"]);
        expect(labels(e)).toEqual(["입력 형식", "탭 2"]);
        expect(e.getHTML()).toContain('data-tab-title="입력 형식"');
    });
    it("Escape 로 이름 고치기를 취소한다", async () => {
        const e = make();
        e.commands.setTabs(2);
        await flush();
        const label = chips(e)[0].querySelector(".hce-tab-chip-label");
        label.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
        const input = bar(e).querySelector(".hce-tab-title-input");
        input.value = "버린다";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(titles(e)).toEqual(["탭 1", "탭 2"]);
        expect(bar(e).querySelector(".hce-tab-title-input")).toBeNull();
    });
    it("읽기 모드에는 추가·삭제·이름 고치기가 없고 전환만 된다", async () => {
        const e = make('<div data-type="tabs">' +
            '<div data-type="tab" data-tab-title="A"><p>a</p></div>' +
            '<div data-type="tab" data-tab-title="B"><p>b</p></div>' +
            "</div>", false);
        await flush();
        expect(labels(e)).toEqual(["A", "B"]);
        expect(bar(e).querySelector(".hce-tabs-add")).toBeNull();
        expect(bar(e).querySelector(".hce-tab-chip-close")).toBeNull();
        const label = chips(e)[1].querySelector(".hce-tab-chip-label");
        label.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
        expect(bar(e).querySelector(".hce-tab-title-input")).toBeNull();
        click(label);
        expect(chips(e)[1].classList.contains("is-active")).toBe(true);
    });
    /*
     * ── 아래 셋은 브라우저에서 실제로 터진 버그의 회귀 테스트다 ──────────────
     * 처음 15개는 전부 통과하면서 이 셋을 놓쳤다. "칩이 그려진다"까지만 봤지
     * **커서가 어디 있는지**와 **활성 클래스가 몇 번에 붙었는지**를 안 봤기 때문이다.
     */
    it("⚠️ 회귀 A: 삽입 직후 커서는 첫 탭 안이다", () => {
        const e = make();
        e.commands.setTabs(3);
        const { $from } = e.state.selection;
        const ancestors = [];
        for (let d = $from.depth; d >= 0; d--)
            ancestors.push($from.node(d).type.name);
        expect(ancestors).toContain("tab");
        // 첫 탭이어야 한다 — 마지막 탭이면 화면(활성=0)과 커서가 어긋난다.
        const tabsPos = 0;
        expect($from.pos).toBeGreaterThan(tabsPos + 1);
        expect($from.pos).toBeLessThan(tabsPos + 1 + e.state.doc.child(0).child(0).nodeSize);
        // 만들자마자 치면 첫 탭에 들어가야 한다.
        e.commands.insertContent("AAA");
        expect(titlesAndText(e)).toEqual([
            ["탭 1", "AAA"],
            ["탭 2", ""],
            ["탭 3", ""]
        ]);
    });
    it("⚠️ 회귀 B: 탭을 바꾼 직후 친 글자가 새 탭에 들어간다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        e.commands.insertContent("AAA");
        click(chips(e)[1].querySelector(".hce-tab-chip-label"));
        e.commands.insertContent("BBB");
        // 예전엔 첫 글자가 탭 1로 샜다(탭1 "AAAB", 탭2 "BB").
        expect(titlesAndText(e)).toEqual([
            ["탭 1", "AAA"],
            ["탭 2", "BBB"],
            ["탭 3", ""]
        ]);
    });
    it("⚠️ 회귀 B: 커서가 옮겨지는 순간 두 탭이 **모두** 보인다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        e.commands.insertContent("AAA");
        const panels = e.view.dom.querySelector(".hce-tabs-panels");
        let atMove = null;
        const watch = ({ transaction }) => {
            if (!transaction.selectionSet || atMove !== null)
                return;
            atMove = {
                대상: panels.children[1].classList.contains("hce-tab-active"),
                이전: panels.children[0].classList.contains("hce-tab-active")
            };
        };
        e.on("transaction", watch);
        click(chips(e)[1].querySelector(".hce-tab-chip-label"));
        e.off("transaction", watch);
        /*
         * **보이게 → 옮기기 → 감추기** 순서의 못이다.
         * - `대상`이 false 면 감춰진 곳으로 커서를 보낸 것이고,
         * - `이전`이 false 면 커서가 아직 들어 있는 탭을 먼저 감춘 것이다.
         * 둘 다 브라우저에서 "첫 글자가 이전 탭으로 새는" 증상으로 나타났다.
         */
        expect(atMove).toEqual({ 대상: true, 이전: true });
        // 전환이 끝나면 물론 하나만 남는다.
        expect(activeIndexes(e)).toEqual({ chip: 1, panel: 1 });
    });
    it("⚠️ 회귀 C: 구조가 바뀌어도 활성 클래스가 올바른 인덱스에 붙는다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        expect(activeIndexes(e)).toEqual({ chip: 0, panel: 0 });
        // 탭 추가 — ProseMirror 가 자식 DOM 을 다시 그리면서 클래스를 날리던 자리.
        click(bar(e).querySelector(".hce-tabs-add"));
        await flush();
        expect(activeIndexes(e)).toEqual({ chip: 3, panel: 3 });
        // 이름 변경(속성만 바뀜)에서도 어긋나지 않는다.
        const label = chips(e)[3].querySelector(".hce-tab-chip-label");
        label.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
        const input = bar(e).querySelector(".hce-tab-title-input");
        input.value = "넷";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await flush();
        expect(activeIndexes(e)).toEqual({ chip: 3, panel: 3 });
        // 삭제로 줄어들 때도.
        click(chips(e)[3].querySelector(".hce-tab-chip-close"));
        await flush();
        expect(activeIndexes(e)).toEqual({ chip: 2, panel: 2 });
    });
    it("⚠️ 탭바는 문서 내용이 아니다 — 칩 글자가 저장본에 새지 않는다", async () => {
        const e = make();
        e.commands.setTabs(2);
        await flush();
        const html = e.getHTML();
        expect(html).not.toContain("hce-tabs-bar");
        expect(html).not.toContain("hce-tab-chip");
        // 문서에 남는 것은 탭 두 개와 그 안의 빈 문단뿐이다.
        const node = tabsNode(e);
        expect(node?.content).toHaveLength(2);
        expect(node?.content?.[0]?.content).toHaveLength(1);
    });
});
describe("TabsBlock — 칩 끌어서 순서 바꾸기", () => {
    /** 탭마다 알아볼 수 있는 본문을 넣어 둔다. 내용이 제목만 따라오는지 보려면 필요하다. */
    const withBodies = () => {
        const e = make('<div data-type="tabs">' +
            '<div data-type="tab" data-tab-title="하나"><p>본문 하나</p></div>' +
            '<div data-type="tab" data-tab-title="둘"><p>본문 둘</p></div>' +
            '<div data-type="tab" data-tab-title="셋"><p>본문 셋</p></div>' +
            "</div>");
        return e;
    };
    it("⚠️ 내용이 통째로 따라간다 — 제목만 바꾸는 구현이면 여기서 걸린다", async () => {
        const e = withBodies();
        await flush();
        // 첫 칩을 맨 뒤로.
        drag(e, 0, chipCenter(2) + 30);
        expect(titlesAndText(e)).toEqual([
            ["둘", "본문 둘"],
            ["셋", "본문 셋"],
            ["하나", "본문 하나"]
        ]);
    });
    it("되돌리기 한 번이면 원래 순서로 — 트랜잭션은 하나다", async () => {
        const e = withBodies();
        await flush();
        drag(e, 0, chipCenter(2) + 30);
        expect(titles(e)).toEqual(["둘", "셋", "하나"]);
        e.commands.undo();
        expect(titles(e)).toEqual(["하나", "둘", "셋"]);
    });
    it("활성 탭을 옮기면 새 자리에서 그대로 활성이다", async () => {
        const e = withBodies();
        await flush();
        expect(activeIndexes(e)).toEqual({ chip: 0, panel: 0 });
        drag(e, 0, chipCenter(2) + 30); // 활성(0) → 맨 뒤
        await flush();
        expect(titles(e)).toEqual(["둘", "셋", "하나"]);
        expect(activeIndexes(e)).toEqual({ chip: 2, panel: 2 });
    });
    it("활성보다 앞의 탭을 뒤로 보내면 활성이 한 칸 당겨진다", async () => {
        const e = withBodies();
        await flush();
        click(chips(e)[1].querySelector(".hce-tab-chip-label")); // 활성 = 둘(1)
        await flush();
        drag(e, 0, chipCenter(2) + 30); // 하나(0) → 맨 뒤
        await flush();
        expect(titles(e)).toEqual(["둘", "셋", "하나"]);
        expect(activeIndexes(e)).toEqual({ chip: 0, panel: 0 }); // 여전히 "둘"
    });
    it("활성보다 뒤의 탭을 앞으로 당기면 활성이 한 칸 밀린다", async () => {
        const e = withBodies();
        await flush();
        click(chips(e)[1].querySelector(".hce-tab-chip-label")); // 활성 = 둘(1)
        await flush();
        drag(e, 2, chipCenter(0) - 10); // 셋(2) → 맨 앞
        await flush();
        expect(titles(e)).toEqual(["셋", "하나", "둘"]);
        expect(activeIndexes(e)).toEqual({ chip: 2, panel: 2 }); // 여전히 "둘"
    });
    it("제자리에 놓으면 순서도 활성도 그대로다", async () => {
        const e = withBodies();
        await flush();
        click(chips(e)[1].querySelector(".hce-tab-chip-label"));
        await flush();
        drag(e, 1, chipCenter(1) + 8);
        await flush();
        expect(titles(e)).toEqual(["하나", "둘", "셋"]);
        expect(activeIndexes(e)).toEqual({ chip: 1, panel: 1 });
    });
    it("⚠️ 임계값 미만으로 움직이면 드래그가 아니라 전환 클릭이다", async () => {
        const e = withBodies();
        await flush();
        stubGeometry(e);
        const chip = chips(e)[2];
        const start = chipCenter(2);
        pointer(chip, "pointerdown", start);
        pointer(chip, "pointermove", start + 3); // 5px 미만
        pointer(chip, "pointerup", start + 3);
        click(chip.querySelector(".hce-tab-chip-label"));
        expect(titles(e)).toEqual(["하나", "둘", "셋"]); // 순서 그대로
        expect(activeIndexes(e)).toEqual({ chip: 2, panel: 2 }); // 전환은 됐다
    });
    it("드래그로 끝나면 뒤따르는 클릭이 탭을 바꾸지 않는다", async () => {
        const e = withBodies();
        await flush();
        drag(e, 2, chipCenter(0) - 10); // 셋 → 맨 앞
        // 브라우저는 pointerup 뒤에 click 을 한 번 더 흘린다.
        click(chips(e)[0].querySelector(".hce-tab-chip-label"));
        await flush();
        expect(titles(e)).toEqual(["셋", "하나", "둘"]);
        expect(activeIndexes(e)).toEqual({ chip: 1, panel: 1 }); // 활성은 여전히 "하나"
    });
    it("Esc 로 취소하면 순서가 그대로다", async () => {
        const e = withBodies();
        await flush();
        drag(e, 0, chipCenter(2) + 30, 15, false);
        await flush();
        expect(titles(e)).toEqual(["하나", "둘", "셋"]);
        expect(activeIndexes(e)).toEqual({ chip: 0, panel: 0 });
    });
    it("탭바 밖에 놓으면 순서가 그대로다", async () => {
        const e = withBodies();
        await flush();
        drag(e, 0, chipCenter(2), 400); // 탭바 아래로 한참 내려간 자리
        await flush();
        expect(titles(e)).toEqual(["하나", "둘", "셋"]);
    });
    it("끄는 동안 드롭될 자리가 보인다", async () => {
        const e = withBodies();
        await flush();
        stubGeometry(e);
        const chip = chips(e)[0];
        pointer(chip, "pointerdown", chipCenter(0));
        pointer(chip, "pointermove", chipCenter(0) + 12);
        pointer(chip, "pointermove", chipCenter(1) + 10); // 둘의 중점보다 오른쪽 → 2번 앞
        expect(bar(e).classList.contains("is-dragging")).toBe(true);
        expect(chip.classList.contains("is-dragged")).toBe(true);
        expect(chips(e)[2].classList.contains("is-drop-before")).toBe(true);
        pointer(chip, "pointerup", chipCenter(1) + 10);
        // 놓으면 표시가 사라진다.
        expect(bar(e).classList.contains("is-dragging")).toBe(false);
        expect(chips(e).some((c) => c.classList.contains("is-drop-before"))).toBe(false);
    });
    it("⚠️ 읽기 모드에는 드래그가 없다", async () => {
        const e = make('<div data-type="tabs">' +
            '<div data-type="tab" data-tab-title="하나"><p>a</p></div>' +
            '<div data-type="tab" data-tab-title="둘"><p>b</p></div>' +
            "</div>", false);
        await flush();
        drag(e, 0, chipCenter(1) + 30);
        expect(titles(e)).toEqual(["하나", "둘"]);
        expect(bar(e).classList.contains("is-dragging")).toBe(false);
    });
    it("⚠️ 삭제(×) 위에서 시작한 것은 드래그가 아니다", async () => {
        const e = withBodies();
        await flush();
        stubGeometry(e);
        const close = chips(e)[0].querySelector(".hce-tab-chip-close");
        pointer(close, "pointerdown", chipCenter(0) + 30);
        pointer(chips(e)[0], "pointermove", chipCenter(2));
        expect(bar(e).classList.contains("is-dragging")).toBe(false);
        pointer(chips(e)[0], "pointerup", chipCenter(2));
        // 원래 하던 일(삭제)은 그대로 된다.
        click(close);
        expect(titles(e)).toEqual(["둘", "셋"]);
    });
});
describe("TabsBlock — 회귀: ProseMirror 와의 줄다리기", () => {
    /*
     * ⚠️ 여기 두 개는 **`Tab` 의 `ignoreMutation` 이 빠지면** 터진다.
     * 활성 표시 class 를 `contentDOM` 안의 요소에 쓰면 ProseMirror 가 그것을 "문서가 손으로
     * 고쳐졌다"로 읽고 그 자리를 다시 그리고, 그러면 클래스가 사라져 우리가 또 붙이고…
     * 가 끝없이 돈다. 실측으로 **저장된 탭 문서를 여는 것만으로** 재현됐다.
     */
    it("⚠️ 저장된 탭 문서를 열면 첫 탭이 곧바로 활성이다", async () => {
        const e = make('<div data-type="tabs">' +
            '<div data-type="tab" data-tab-title="하나"><p>a</p></div>' +
            '<div data-type="tab" data-tab-title="둘"><p>b</p></div>' +
            "</div>");
        await flush();
        // 예전엔 여기서 `panel: -1` — 어느 탭도 안 보이는 빈 상자였다.
        expect(activeIndexes(e)).toEqual({ chip: 0, panel: 0 });
    });
    it("⚠️ 다시 그리기가 멈춘다 — 여러 번 기다려도 상태가 그대로다", async () => {
        const e = make();
        e.commands.setTabs(3);
        await flush();
        click(chips(e)[1].querySelector(".hce-tab-chip-label"));
        await flush();
        const first = activeIndexes(e);
        await flush();
        await flush();
        // 루프가 돌면 위 대기에서 멈추거나, 여기서 값이 달라진다.
        expect(activeIndexes(e)).toEqual(first);
        expect(first).toEqual({ chip: 1, panel: 1 });
    });
});
