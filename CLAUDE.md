# @hancomac/editor 규칙

**중요: 에디터 수정 시 이 문서도 반드시 함께 업데이트한다.**

## 프로젝트 구조
- `src/components/` - React 컴포넌트 (TipTapEditor, FixedToolbar, BubbleToolbar, TableBubbleMenu, SlashCommandMenu, InputModal, PdfViewer, BlockHandle)
- `src/extensions/` - TipTap 커스텀 확장 (PdfBlock)
- `src/styles/editor.css` - 에디터 전용 CSS
- `src/utils/` - 유틸리티 (cn, sanitize, pdf, escape-html)
- `src/types.ts` - TypeScript 타입 정의
- `dev/` - 독립 개발 서버 (Vite, 포트 5555)
- `dist/` - 빌드 결과물 (tsup)

## 빌드
- `npm run build` — 프로덕션 빌드 (tsup, ESM+CJS+DTS)
- `npm run dev` — 빌드 watch 모드
- `npm run dev:preview` — 독립 개발 서버 (localhost:5555)
- 빌드 후 main 프로젝트에서 심링크로 즉시 반영됨

## 핵심 규칙

### CSS 변수
- **`hsl()` 래핑 금지** — 호스트 앱의 CSS 변수가 hex 값(`#e2e8f0`)이므로 `hsl(var(--border))`는 동작하지 않음. 반드시 `var(--border)` 직접 사용
- **opacity가 필요한 경우** — `color-mix(in srgb, var(--primary) 15%, transparent)` 사용
- 사용 가능한 변수: `--background`, `--foreground`, `--primary`, `--muted`, `--muted-foreground`, `--border`, `--popover`, `--destructive`

### Tailwind 클래스
- **동적 클래스(min-w-[220px] 등) 사용 금지** — tsup 빌드에서 Tailwind purge로 제거됨. 인라인 `style={{ minWidth: "220px" }}`로 대체
- 기본 Tailwind 클래스(p-2, flex 등)는 호스트 앱에서 처리하므로 사용 가능

### 에디터 ↔ 게시물 스타일 동기화
- 에디터 CSS는 `.tiptap` 셀렉터 (editor.css)
- 게시물 CSS는 `.post-content` 셀렉터 (main의 globals.css)
- **둘의 스타일은 반드시 동일해야 함** — 표, 코드블록, 체크리스트, 인용문 등
- 에디터 CSS 수정 시 globals.css의 `.post-content`도 동일하게 수정할 것
- 코드블록 hljs 색상도 양쪽에 동일하게 적용

### 서버 sanitizer (main의 lib/sanitize.ts)
- 새 HTML 태그 추가 시 `ALLOWED_TAGS`에 등록 필수
- 새 속성 추가 시 `ALLOWED_ATTRS`에 등록 필수 (예: `data-pdf-src`, `style`)
- 클라이언트 DOMPurify에도 `ADD_TAGS`, `ADD_ATTR` 추가 필요 (CommunityPage.tsx)

### 표 (Table)
- `resizable: true` — colgroup/col로 너비 저장
- 서버 sanitizer에 `colgroup`, `col` 태그 + `col`의 `style` 속성 허용 필요
- `width: 100%` 강제하지 않음 — colgroup 너비에 의존
- 에디터에서 `.tiptap > .tableWrapper` margin 조정으로 정렬

### PDF
- 에디터: `PdfBlock` 커스텀 노드 + `PdfBlockView` React 컴포넌트로 인라인 뷰어
- 게시물: `div[data-pdf-src]`를 찾아 `PostPdfViewer`로 동적 교체 (createRoot)
- PDF.js 파일(`pdf.min.mjs`, `pdf.worker.min.mjs`)은 호스트 앱 public 폴더에 필요

### 코드블록
- highlight.js Atom One Dark 테마 사용
- 에디터: `import "highlight.js/styles/atom-one-dark.css"` + lowlight
- 게시물: `hljs.highlightElement()`로 클라이언트 하이라이팅 + CSS에 `.hljs-*` 색상 정의

### 비활성화된 기능
- **Details(접기/펼치기)** — @tiptap/extension-details v3.21.0 + details-content/summary 3.0.0-beta.11 사용 중. 슬래시 명령 "토글"로 삽입 가능
- **Floating Menu(+ 버튼)** — 에디터 레이아웃 충돌로 비활성화, 슬래시(/) 명령으로 대체
- **Drag Handle** — @tiptap/extension-collaboration 의존성 체인 문제로 비활성화
- **Focus(블록 강조)** — 사용자 요청으로 제거

### 의존성 주의사항
- `--legacy-peer-deps` 필요 — TipTap v3과 일부 확장의 peer dependency 충돌
- `@tiptap/extension-drag-handle-react` → `@tiptap/extension-collaboration` → `@tiptap/y-tiptap` → `y-protocols` 체인 문제로 사용 불가
- Node.js 22 LTS 사용 (.nvmrc). Node 25는 localStorage 내장 문제로 사용 금지

### onUploadFile prop
- 이미지 붙여넣기, 드래그앤드롭, PDF 업로드 모두 이 prop에 의존
- 호스트 앱에서 `async (file: File) => string(url)` 형태로 전달
- 미전달 시 업로드 기능 비활성화

### 들여쓰기 (Indent)
- 커스텀 `Indent` 확장 (`src/extensions/Indent.ts`)
- Tab/Shift+Tab으로 문단·제목 들여쓰기/내어쓰기 (리스트 내부에서는 기존 동작 유지)
- `margin-left` 인라인 스타일로 렌더링 (2em 단위, 최대 8레벨)
- 호스트 앱 sanitizer에서 `p`, `h1`~`h3`의 `style` 속성 허용 필요

### 플레이스홀더
- 기본값: `"'/'를 눌러 명령어를 입력하세요..."`
- 제목(h1~h3)은 별도 플레이스홀더 표시
