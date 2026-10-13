import { Node } from "@tiptap/core";
/**
 * 저장된 폭을 믿을 수 있는 값으로 거른다. `px`·`%` 숫자만 받고 나머지는 null(= 꽉 찬 폭).
 *
 * ⚠️ 이 값은 `style="width: …"` 로도 나간다. 아무 문자열이나 받으면 `;` 로 선언을 닫고
 *    다른 선언을 열 수 있다(`CardBlock` 의 `safeBackground` 와 같은 방어).
 */
export declare const normalizeTabsWidth: (raw: unknown) => string | null;
/**
 * 탭 하나. `tabs` 안에서만 산다(`group: ""`).
 *
 * `isolating: true` — 탭 경계 너머로 지우기·병합이 넘어가지 않게 한다. 없으면 탭 맨 앞에서
 * Backspace 를 눌렀을 때 앞 탭의 내용과 합쳐진다.
 */
export declare const Tab: Node<any, any>;
export declare const TabsBlock: Node<any, any>;
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        tabs: {
            /** 탭 블록을 넣는다. 탭마다 빈 문단 하나. 기본 3개. */
            setTabs: (count?: number) => ReturnType;
        };
    }
}
//# sourceMappingURL=TabsBlock.d.ts.map