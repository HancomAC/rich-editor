# @hancomac/editor

TipTap 기반 Notion-style 리치 텍스트 에디터 패키지

## 개요

`hancomac-next` 프로젝트에서 에디터 관련 코드를 독립 패키지로 분리한 프로젝트입니다.
TipTap v3 + React 18+ 기반으로, Notion 스타일의 블록 에디터 기능을 제공합니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| 에디터 엔진 | TipTap v3.20.x |
| UI 프레임워크 | React 18+ |
| 언어 | TypeScript 5.7 |
| 빌드 도구 | tsup (ESM + CJS 듀얼 빌드) |
| 아이콘 | lucide-react |
| 스타일 | Tailwind CSS 유틸리티 + 자체 CSS |

## 프로젝트 구조

```
hancomac-editor/
├── src/
│   ├── components/
│   │   ├── TipTapEditor.tsx        # 메인 에디터 컴포넌트
│   │   ├── FixedToolbar.tsx        # 상단 고정 툴바
│   │   ├── BubbleToolbar.tsx       # 텍스트 선택 시 뜨는 플로팅 툴바
│   │   ├── BlockHandle.tsx         # 블록 좌측 핸들 (드래그/추가)
│   │   ├── SlashCommandMenu.tsx    # `/` 슬래시 커맨드 메뉴
│   │   └── PdfViewer.tsx           # PDF 뷰어 컴포넌트
│   ├── extensions/
│   │   ├── PdfBlock.ts             # PDF 블록 TipTap 확장
│   │   └── PdfBlockView.tsx        # PDF 블록 렌더링
│   ├── styles/
│   │   └── editor.css              # 에디터 전용 스타일
│   ├── utils/
│   │   ├── cn.ts                   # Tailwind 클래스 병합 유틸리티
│   │   ├── escape-html.ts          # HTML 이스케이프
│   │   ├── pdf.ts                  # PDF.js 설정/로더
│   │   └── sanitize.ts             # HTML 새니타이즈 (XSS 방지)
│   ├── index.ts                    # 패키지 exports
│   └── types.ts                    # TypeScript 인터페이스
├── dist/                           # 빌드 결과물
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 주요 기능

### 에디터 (TipTapEditor)
- 리치 텍스트 편집 (Bold, Italic, Underline, Strikethrough, Highlight)
- 제목 (H1, H2, H3)
- 목록 (Bullet, Ordered)
- 인용문, 구분선
- 코드 블록 (C++, Python 구문 강조)
- 이미지 삽입 및 붙여넣기 업로드
- PDF 블록 삽입
- 링크 삽입/편집
- 테이블 (삽입, 행/열 추가/삭제, 병합)
- 텍스트 정렬 (좌/중/우)
- 텍스트 색상

### 슬래시 커맨드 (`/`)
`/` 입력 시 커맨드 팔레트 표시. 키보드 방향키/Enter로 선택 가능.

### 툴바
- **FixedToolbar**: 상단 고정, 전체 서식 옵션
- **BubbleToolbar**: 텍스트 선택 시 플로팅 메뉴

### 블록 핸들
블록 좌측 호버 시 `+` (새 블록) / `⠿` (드래그) 핸들 표시

## Exports

### 컴포넌트
| Export | 설명 |
|--------|------|
| `TipTapEditor` | 메인 에디터 컴포넌트 |
| `FixedToolbar` | 상단 고정 툴바 |
| `BubbleToolbar` | 플로팅 선택 툴바 |
| `BlockHandle` | 블록 핸들 UI |
| `SlashCommandMenu` | 슬래시 커맨드 메뉴 |
| `PdfViewer` | 독립형 PDF 뷰어 |

### 확장
| Export | 설명 |
|--------|------|
| `PdfBlock` | TipTap PDF 블록 노드 확장 |

### 유틸리티
| Export | 설명 |
|--------|------|
| `sanitizeHtml` | HTML 새니타이즈 |
| `stripHtmlToExcerpt` | HTML → 플레인 텍스트 발췌 |
| `configurePdfJs` | PDF.js 경로 설정 |
| `getPdfJs` | PDF.js 인스턴스 가져오기 |
| `cn` | Tailwind 클래스 병합 |

### 타입
```typescript
TipTapEditorProps    // 에디터 props
UploadHandler        // 파일 업로드 핸들러
FixedToolbarProps    // 고정 툴바 props
BlockHandleProps     // 블록 핸들 props
SlashCommandMenuProps // 슬래시 메뉴 props
PdfViewerProps       // PDF 뷰어 props
SlashMenuItem        // 슬래시 메뉴 아이템
```

## 사용법

### 설치 (로컬 심링크)

```bash
# hancomac-next에서
cd node_modules/@hancomac
ln -s ../../../hancomac-editor editor
```

### 기본 사용

```tsx
import { TipTapEditor } from "@hancomac/editor";
import "@hancomac/editor/styles";

function MyPage() {
  const [content, setContent] = useState("");

  return (
    <TipTapEditor
      content={content}
      onChange={setContent}
      placeholder="내용을 입력하세요..."
      onUploadFile={async (file) => {
        // 파일 업로드 후 URL 반환
        return "https://example.com/uploaded-file.png";
      }}
    />
  );
}
```

### Next.js에서 사용 (SSR 비활성화)

```tsx
import dynamic from "next/dynamic";

const TipTapEditor = dynamic(
  () => import("@hancomac/editor").then((m) => ({ default: m.TipTapEditor })),
  { ssr: false }
);
```

### PDF 뷰어 사용

```tsx
import { PdfViewer } from "@hancomac/editor";

<PdfViewer src="/path/to/document.pdf" name="문서.pdf" />
```

## 빌드

```bash
# 빌드
npm run build

# 개발 모드 (watch)
npm run dev
```

빌드 결과물:
- `dist/index.js` — ESM 번들
- `dist/index.cjs` — CommonJS 번들
- `dist/index.d.ts` — TypeScript 타입 정의
- `dist/styles/editor.css` — 에디터 스타일시트

## hancomac-next 연동 현황

### Import 사용처

| 파일 | 사용 컴포넌트 |
|------|--------------|
| `src/components/pages/CommunityPostEditor.tsx` | `TipTapEditor` (dynamic) |
| `src/app/(admin)/admin/posts/new/page.tsx` | `TipTapEditor` (dynamic) |
| `src/app/(admin)/admin/posts/[id]/edit/page.tsx` | `TipTapEditor` (dynamic) |
| `src/components/pages/CommunityPage.tsx` | `PdfViewer` (direct) |
| `src/lib/upload.ts` | `UploadHandler` (type) |
| `src/app/globals.css` | `@hancomac/editor/styles` (CSS) |

## 참고사항

- PDF.js 사용 시 `/pdf.min.mjs`, `/pdf.worker.min.mjs` 파일을 public 폴더에 배치해야 합니다
- `"use client"` 배너가 번들에 자동 삽입되므로 Next.js App Router에서 별도 지시자 불필요
- React 18+ peer dependency 필요
