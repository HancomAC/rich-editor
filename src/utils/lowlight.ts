/**
 * 코드블록 문법 하이라이터. **앱 전체에 한 벌**이다.
 *
 * ── ⚠️ `common`(37종)·`all`(192종)을 쓰지 않는다 ──────────────────────────────
 * lowlight 의 묶음 export 는 언어를 통째로 끌고 들어오고 **트리셰이킹이 되지 않는다**
 * (전부 참조되기 때문). 정올 빌드 산출물을 실측하면 하이라이터 문법이 **한 청크에
 * 402KB(gzip) / 1.2MB(raw)** 로 앉아 있었다 — 코드블록이 있는 문서를 열 때마다 받는다.
 * 여기서 실제로 쓰이는 건 채점 언어 몇 개뿐이다.
 *
 * 그래서 **필요한 것만 명시 등록**한다.
 *
 * 목록 근거 — **직접 고르거나 붙여넣을 만한 것**까지 넉넉히 잡았다. 언어 선택 UI 는
 * `cpp·java·python` 셋뿐이지만, 저장된 문서에는 `language-sql` 처럼 다른 값이 들어 있을
 * 수 있고 그때 색이 빠지면 눈에 띈다.
 *
 *   · 채점·알고리즘 (9)  cpp·java·python 과 그 밖의 흔한 언어
 *   · DB·질의     (3)  hljs 에 있는 DB 계열은 이 셋이 전부다(`plsql`·`mongodb` 는 없다)
 *   · 웹·데이터   (4)  `xml` 이 HTML 을 겸한다
 *   · 셸·설정     (5)  코드 예시에 딸려 오는 명령·설정 파일
 *   · 서식 없음   (1)  `plaintext` — 아래 참조
 *
 * 스물둘을 다 넣어도 **40KB 대(gzip)** 다 — 묶음 export 는 398KB 였다. 크기 여유가
 * 크므로 "혹시 쓸까" 싶은 것은 빼기보다 넣는 쪽이 낫다.
 *
 * ⚠️ **`plaintext` 는 "색을 빼는" 언어다 — 없으면 오히려 칠해진다.** 등록되지 않은
 *    이름은 자동 감지로 떨어지므로, 색을 빼려고 ```text 로 적은 블록에 엉뚱한 문법
 *    색이 붙었다(예시 입출력·ASCII 그림). `plaintext` 는 `text`·`txt` 를 별칭으로
 *    갖고 `disableAutodetect: true` 라, 등록해도 다른 언어의 감지 후보를 늘리지
 *    않는다 — `c` 를 뺀 이유와 충돌하지 않는다.
 *
 * ⚠️ **`c` 는 일부러 없다.** C++ 문법이 C 를 사실상 포함해 색이 거의 같은데, 자동 감지
 *    후보에 넣으면 relevance 를 과하게 먹어 **Python 코드까지 `c` 로 판정**했다(실측).
 *    `language-c` 로 지정된 블록은 자동 감지로 떨어져 `cpp` 로 칠해진다 — 눈으로는 같다.
 *
 * ⚠️ **여기 없는 언어는 색이 빠진다** — 깨지지는 않고 평범한 글자로 나온다.
 *    늘려야 할 언어가 생기면 이 목록에 추가한다. `common`/`all` 로 되돌리지 말 것.
 * ⚠️ `js`·`ts`·`c++` 같은 짧은 이름은 문법 정의가 자기 `aliases` 로 갖고 있어 따로
 *    등록하지 않아도 인식된다.
 */
import { createLowlight } from "lowlight";
import cpp from "highlight.js/lib/languages/cpp";
import java from "highlight.js/lib/languages/java";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import kotlin from "highlight.js/lib/languages/kotlin";
import go from "highlight.js/lib/languages/go";
import csharp from "highlight.js/lib/languages/csharp";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import pgsql from "highlight.js/lib/languages/pgsql";
import graphql from "highlight.js/lib/languages/graphql";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import makefile from "highlight.js/lib/languages/makefile";
import ini from "highlight.js/lib/languages/ini";
import diff from "highlight.js/lib/languages/diff";
import plaintext from "highlight.js/lib/languages/plaintext";

/** 등록하는 언어 이름. 테스트가 이 목록으로 실제 등록분을 검사한다. */
export const CODE_LANGUAGES = [
  // 채점·알고리즘
  "cpp",
  "java",
  "python",
  "javascript",
  "typescript",
  "kotlin",
  "go",
  "csharp",
  "rust",
  // DB·질의
  "sql",
  "pgsql",
  "graphql",
  // 웹·데이터 (`xml` 이 HTML 을 겸한다)
  "xml",
  "css",
  "json",
  "yaml",
  // 셸·설정
  "bash",
  "shell",
  "makefile",
  "ini",
  "diff",
  // 서식 없음 (별칭 `text`·`txt`)
  "plaintext",
] as const;

export const lowlight = createLowlight();

lowlight.register({
  cpp,
  java,
  python,
  javascript,
  typescript,
  kotlin,
  go,
  csharp,
  rust,
  sql,
  pgsql,
  graphql,
  xml,
  css,
  json,
  yaml,
  bash,
  shell,
  makefile,
  ini,
  diff,
  plaintext,
});
