export interface StaticText {
    type: "text";
    /** 원문 그대로 — 엔티티가 살아 있다. 글자로 읽을 때는 `decodeEntities`를 거친다. */
    raw: string;
}
/** 주석·독타입·짝 잃은 닫는 태그·주입된 HTML(하이라이트·KaTeX) 등 "그대로 내보내는" 조각. */
export interface StaticRaw {
    type: "raw";
    raw: string;
}
export interface StaticAttr {
    /** 소문자 이름 — 조회용. */
    name: string;
    /** 원문 표기 이름 — 태그를 다시 조립할 때 쓴다. */
    rawName: string;
    /** 디코드된 값. `null`이면 값 없는 속성(`<details open>`). */
    value: string | null;
}
export interface StaticElement {
    type: "element";
    /** 소문자 태그 이름. */
    name: string;
    /** 원문 표기 이름 — 태그를 다시 조립할 때 쓴다. */
    rawName: string;
    attrs: StaticAttr[];
    /** 여는 태그 원문(`<pre class="…">`). `dirty`가 아니면 이대로 내보낸다. */
    rawTag: string;
    /** 닫는 태그 원문. 없으면(void·self-closing·미닫힘) 빈 문자열. */
    endTag: string;
    selfClosing: boolean;
    /** 속성이 바뀌어 여는 태그를 다시 조립해야 하는가. */
    dirty: boolean;
    children: StaticNode[];
}
export type StaticNode = StaticText | StaticRaw | StaticElement;
export interface StaticRoot {
    children: StaticNode[];
}
/**
 * HTML 엔티티 디코드. 한 번의 치환 패스라 `&amp;lt;`는 `&lt;`가 된다(이중 디코드 없음) —
 * latex·코드 원문에 흔한 `<`·`&`를 정확히 되살리는 데 필요한 성질이다.
 */
export declare function decodeEntities(value: string): string;
export declare function parseHtml(html: string): StaticRoot;
export declare function serializeHtml(root: StaticRoot): string;
/** DOM `getAttribute`처럼 — 첫 동명 속성, 값 없는 속성은 `""`, 없으면 `null`. */
export declare function getAttribute(element: StaticElement, name: string): string | null;
export declare function setAttribute(element: StaticElement, name: string, value: string): void;
export declare function firstElementChild(element: StaticElement): StaticElement | null;
/** DOM `textContent`처럼 자손 텍스트를 디코드해 잇는다. 주석·raw 조각은 세지 않는다. */
export declare function textContent(element: StaticElement): string;
//# sourceMappingURL=tokenizer.d.ts.map