import { describe, it, expect } from "vitest";
import { lowlight, CODE_LANGUAGES } from "./lowlight";

/*
 * 이 목록은 **번들 크기와 직결된다.** `common`(37종)·`all`(192종)로 되돌리면 하이라이터
 * 문법만 402KB(gzip) 가 된다(정올 빌드 실측). 그래서 "몇 개가 실려 있는지"를 못박아,
 * 나중에 무심코 묶음 export 로 되돌아가는 걸 테스트가 잡게 한다.
 */
describe("코드 하이라이터 언어 목록", () => {
  it("선언한 목록만 등록한다", () => {
    expect(lowlight.listLanguages().sort()).toEqual([...CODE_LANGUAGES].sort());
  });

  it("묶음 export 로 되돌아가지 않았다 (common 37 · all 192)", () => {
    expect(lowlight.listLanguages().length).toBe(CODE_LANGUAGES.length);
    expect(lowlight.listLanguages().length).toBeLessThan(37);
  });

  /* 붙여넣기로 들어오는 대표 언어들 — 빠지면 색이 조용히 사라진다. */
  it("DB 계열(sql·pgsql·graphql)이 들어 있다", () => {
    for (const lang of ["sql", "pgsql", "graphql"]) {
      expect(lowlight.registered(lang)).toBe(true);
    }
  });

  it("웹·셸 계열(xml/html·css·json·bash)이 들어 있다", () => {
    for (const lang of ["xml", "css", "json", "bash"]) {
      expect(lowlight.registered(lang)).toBe(true);
    }
    // `xml` 이 HTML 을 겸한다
    expect(lowlight.registered("html")).toBe(true);
  });

  it("채점 언어(cpp·java·python)는 반드시 들어 있다", () => {
    for (const lang of ["cpp", "java", "python"]) {
      expect(lowlight.registered(lang)).toBe(true);
    }
  });

  /*
   * ⚠️ `c` 는 일부러 없다 — C++ 문법이 C 를 사실상 포함하고, 자동 감지 후보에 넣으면
   * relevance 를 과하게 먹어 Python 코드까지 `c` 로 판정했다(실측).
   */
  it("c 는 등록하지 않는다 (cpp 가 대신한다)", () => {
    expect(lowlight.registered("c")).toBe(false);
    expect(lowlight.registered("cpp")).toBe(true);
  });

  /*
   * 짧은 이름은 문법 정의가 자기 `aliases` 로 갖고 있다. 따로 등록하지 않아도 되는지를
   * 확인해 둔다 — 안 되면 저장된 `language-js` 코드블록이 색을 잃는다.
   */
  it("별칭(js·ts·c++)도 그대로 인식한다", () => {
    expect(lowlight.registered("js")).toBe(true);
    expect(lowlight.registered("ts")).toBe(true);
    expect(lowlight.registered("c++")).toBe(true);
  });

  /*
   * ⚠️ 이게 빠지면 증상이 "색이 없다"가 아니라 **"엉뚱한 색이 붙는다"** 라 눈에 안 띈다.
   * 등록되지 않은 이름은 자동 감지로 떨어지므로, 색을 빼려고 ```text 로 적은 예시
   * 입출력에 문법 색이 칠해졌다. `disableAutodetect` 라 다른 언어의 감지는 안 건드린다.
   */
  it("plaintext 가 text·txt 별칭으로 등록돼 있다", () => {
    for (const lang of ["plaintext", "text", "txt"]) {
      expect(lowlight.registered(lang)).toBe(true);
    }
  });

  it("plaintext 는 색을 입히지 않는다", () => {
    const tree = lowlight.highlight("text", "3 1\n1 2 3");
    expect(tree.children.every((node) => node.type === "text")).toBe(true);
  });

  it("등록하지 않은 언어는 색이 없다(깨지지는 않는다)", () => {
    expect(lowlight.registered("ruby")).toBe(false);
    // 색을 못 입혀도 예외를 던지지 않고 평범한 텍스트로 남는지
    expect(() => lowlight.highlightAuto("puts 'hi'")).not.toThrow();
  });
});
