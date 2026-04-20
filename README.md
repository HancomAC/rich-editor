# @teriusu/rich-editor

TipTap v3 기반 리치 텍스트 에디터. Svelte 5 컴포넌트 라이브러리.

## 설치

```bash
npm install @teriusu/rich-editor
```

Tailwind CSS v4 사용 시 `@source` 추가:
```css
@import "@teriusu/rich-editor/styles";
@source "../node_modules/@teriusu/rich-editor/dist";
```

## 기본 사용법

```svelte
<script>
  import { TipTapEditor } from '@teriusu/rich-editor';
  import '@teriusu/rich-editor/styles';

  let html = $state('');
</script>

<TipTapEditor
  content={html}
  onChange={(h) => html = h}
  onUploadFile={async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const { url } = await res.json();
    return url;
  }}
/>
```

## Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `content` | `string` | `""` | HTML 콘텐츠 |
| `onChange` | `(html: string) => void` | 필수 | 콘텐츠 변경 콜백 |
| `placeholder` | `string` | `"'/'를 눌러..."` | 플레이스홀더 |
| `onUploadFile` | `(file: File) => Promise<string>` | - | 파일 업로드 핸들러 (URL 반환) |
| `onResolveFile` | `(fileId: string) => Promise<{src, name?, size?}>` | - | 파일 ID → URL 변환 |
| `extensions` | `AnyExtension[]` | `[]` | 추가 TipTap 확장 주입 |
| `editable` | `boolean` | `true` | 읽기 전용 모드 |

## 파일 저장 방식

### URL 직접 (기본)

`onUploadFile`만 제공하면 파일 URL이 HTML에 직접 저장됩니다.

```html
<div data-file-src="/files/report.pdf" data-file-name="report.pdf" data-file-size="204800"></div>
```

### ID 기반 (하이브리드)

`onResolveFile`을 추가하면 파일 ID + 캐시 URL이 함께 저장됩니다.

```svelte
<TipTapEditor
  content={html}
  onChange={(h) => html = h}
  onUploadFile={async (file) => {
    const res = await fetch('/api/upload', { method: 'POST', body: file });
    return await res.json(); // { id, url, name, size }
  }}
  onResolveFile={async (fileId) => {
    const res = await fetch(`/api/files/${fileId}`);
    return await res.json(); // { src, name, size }
  }}
/>
```

```html
<div data-file-id="abc123" data-file-src="/files/report.pdf" data-file-name="report.pdf"></div>
```

ID 기반은 URL이 변경되어도 대응 가능하고, 권한 제어(signed URL)에 활용할 수 있습니다.

## 기능

### 텍스트 서식
Bold, Italic, Underline, Strikethrough, Highlight, Superscript, Subscript, 텍스트 색상

### 구조
제목 (H1~H3), 글머리/번호 목록, 체크리스트, 인용문, 구분선, 접기/펼치기 (Details), 들여쓰기 (Tab/Shift-Tab)

### 미디어
이미지, PDF (PDF.js 캔버스 렌더링), 영상 파일 (mp4/webm), YouTube, 파일 첨부, 드래그 앤 드롭 업로드

### 레이아웃
2단/3단 컬럼, 텍스트 정렬 (좌/중/우)

### 테이블
삽입, 행/열 추가/삭제, 헤더 토글, 셀 병합/분할, 셀 배경색, 열 리사이즈

### 입력
`/` 슬래시 커맨드, 고정 툴바, 테이블 버블 메뉴, Undo/Redo

## 레거시 HTML 호환

TipTap v2 커스텀 태그를 자동 변환합니다. 에디터 로드 시 `transformLegacyHtml`이 자동 호출됩니다.

| 레거시 태그 | 변환 결과 |
|---|---|
| `<tiptap-file id="X">` | `<div data-file-id="X">` |
| `<tiptap-midibus id="X">` | iframe (play.mbus.tv) |
| `<tiptap-collapsable title="X">` | `<details><summary>` |
| `<lite-youtube videoid="X">` | YouTube iframe |
| `<embed type="application/pdf">` | `<div data-pdf-src>` |
| `<div class="tiptap-columns">` | `<div data-type="columns">` |
| `margin-left: 40px` | indent level 1 (em 출력) |

게시물 조회 페이지(읽기 전용)에서도 적용:

```js
import { transformLegacyHtml } from '@teriusu/rich-editor';

const html = transformLegacyHtml(post.content);
```

## 커스텀 확장 주입

`extensions` prop으로 호스트 앱 전용 확장을 주입할 수 있습니다.

```svelte
<script>
  import { TipTapEditor } from '@teriusu/rich-editor';
  import { Node } from '@tiptap/core';

  const MyExtension = Node.create({ /* ... */ });
</script>

<TipTapEditor
  content={html}
  onChange={handleChange}
  extensions={[MyExtension]}
/>
```

## Exports

### 컴포넌트
`TipTapEditor`, `FixedToolbar`, `BubbleToolbar`, `SlashCommandMenu`, `TableBubbleMenu`, `InputModal`, `PdfViewer`

### 확장
`PdfBlock`, `FileAttachment`, `VideoBlock`, `Columns`, `Column`, `Indent`, `FixedDetails`

### 유틸리티
`transformLegacyHtml`, `sanitizeHtml`, `stripHtmlToExcerpt`, `configurePdfJs`, `getPdfJs`, `cn`

### 타입
`UploadHandler`, `FileResolver`, `FileResolveResult`, `TipTapEditorProps`, `SlashMenuItem`

## 빌드 / 배포

```bash
npm run build          # svelte-package → dist/
npm test               # vitest
```

배포는 **main 브랜치 push 시 GitHub Actions가 자동 수행** (`.github/workflows/publish.yml`).
수동 `npm publish`는 사용하지 않음.

### 버전 정책 (SemVer)

| 단계 | 조건 | 커밋 타입 |
|------|------|-----------|
| **patch** (`0.0.x`) | 버그 수정, 내부 리팩토링, 스타일 조정, 의존성 patch | `fix:`, `chore:`, `refactor:`, `style:` |
| **minor** (`0.x.0`) | 하위 호환 기능 추가 (새 prop, 새 extension, 새 toolbar feature) | `feat:` |
| **major** (`x.0.0`) | 깨는 변경 (prop 제거·rename, peer dep major bump, export 경로 변경) | `feat!:` / `BREAKING CHANGE:` |

> `0.x`대에서는 관행상 **minor도 breaking일 수 있음**. 호스트 앱은 `^0.5.3` 대신 `~0.5.3` 사용을 권장.

### 릴리스 플로우

1. **patch만 필요한 변경**: 소스 수정 후 `main`에 push → CI가 `package.json`의 버전이 이미 publish된 최신과 같으면 **자동 patch bump** 후 publish
2. **minor / major 변경**: push 전에 수동 bump
   ```bash
   npm version minor --no-git-tag-version   # 또는 major
   git add package.json package-lock.json
   git commit -m "chore: v$(node -p 'require(\"./package.json\").version')"
   git push
   ```
   CI가 "이미 bump됨"을 감지하고 그 버전으로 publish.

### 자동 전파

publish 성공 시 `repository_dispatch` (`rich-editor-published`) 이벤트가 다음 repo로 전송되고, 각 repo의 `update-*` 워크플로우가 `package.json`을 새 버전으로 업데이트 + 커밋:
- `teriusu-ko/hancomac` → `@teriusu/rich-editor`
- `HancomAC/arcturus-next` → `apps/jungol`, `apps/codepass`의 `@teriusu/rich-editor`

`teriusu-ko/teriusu`는 현재 수동 업데이트 (hook 미설정 — `GH_PAT` secret 추가 시 연결 가능).

## 기술 스택

| 구분 | 기술 |
|------|------|
| 에디터 엔진 | TipTap v3 |
| UI | Svelte 5 (runes) |
| 언어 | TypeScript |
| 빌드 | svelte-package |
| 아이콘 | lucide-svelte |
| 스타일 | Tailwind CSS + CSS 변수 |
