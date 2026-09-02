import type { Editor } from "@tiptap/core";
import type { Component } from "svelte";
import type { FileResolver } from "./extensions/FileAttachment";
import type { MathPrompt } from "./extensions/Math";

/** 파일 업로드 핸들러 -- 호스트 앱에서 구현 */
export type UploadHandler = (file: File) => Promise<string>;

/**
 * URL 프롬프트 핸들러 -- 호스트 앱에서 Dialog 등으로 구현.
 * 제공되지 않으면 내장 InputModal (링크/이미지) 또는 window.prompt (Bubble)로 폴백.
 * null 반환 = 취소.
 */
export type PromptHandler = (defaultValue: string) => Promise<string | null>;

/** 툴바 모드 */
export type ToolbarMode = 'minimal' | 'standard' | 'full';

/** 개별 툴바 기능 ID */
export type ToolbarFeature =
	// 서식
	| 'bold' | 'italic' | 'underline' | 'strike' | 'highlight'
	| 'superscript' | 'subscript' | 'code' | 'text-color'
	// 정렬
	| 'align-left' | 'align-center' | 'align-right'
	// 제목
	| 'paragraph' | 'h1' | 'h2' | 'h3'
	// 블록
	| 'bullet-list' | 'ordered-list' | 'checklist'
	| 'blockquote' | 'horizontal-rule' | 'toggle'
	// 미디어
	| 'link' | 'image' | 'pdf' | 'file' | 'mbus' | 'video' | 'card'
	// 레이아웃
	| 'columns-2' | 'columns-3' | 'tabs' | 'table' | 'code-block' | 'math'
	// 히스토리
	| 'undo' | 'redo'
	// UI 영역
	| 'fixed-toolbar' | 'bubble-toolbar' | 'slash-menu'
	| 'table-menu' | 'character-count' | 'upload-overlay';

/**
 * 모드별 기본 feature 프리셋.
 *
 * ⚠️ `'card'` 는 **일부러 빠져 있다.** 실제로 안 쓰여서 삽입 메뉴와 슬래시 메뉴에서
 * 내렸다(사용자 요청). 다만 **확장 자체는 계속 등록된다** — 빼면 이미 카드가 들어간
 * 문서가 열릴 때 노드를 못 알아보고 내용이 날아간다. 넣는 길만 닫은 것이라,
 * 쓰고 싶은 호스트는 `features` 에 `'card'` 를 직접 넣으면 그대로 살아난다.
 *
 * ⚠️ `'math'` 는 **세 프리셋 모두**에 있다. 온라인저지라 댓글에도 `$O(n \log n)$` 이
 * 예사로 나오고, 무엇보다 `$…$` 입력 규칙과 붙여넣기 변환은 feature 와 무관하게 항상
 * 걸려 있어서(확장 자체가 그렇다) 여기서만 빼면 "쳐서 만들면 되는데 메뉴엔 없는" 상태가 된다.
 *
 * ⚠️ `'bubble-toolbar'` 도 이제 **세 프리셋 모두**에 있다. 예전엔 `minimal` 에만 있어서,
 * 고정 툴바를 쓰는 곳(정올·코드패스의 기본인 `full`)에서는 **글자를 끌어 골라도 아무것도
 * 안 떴다**(사용자 요청으로 켬). 고정 툴바와 겹쳐 보이지만 하는 일이 다르다 —
 * 고정 툴바는 늘 같은 자리에 있고, 버블은 **고른 글자 바로 위**에 와서 손이 덜 움직인다.
 * 버블은 선택이 비어 있으면 뜨지 않으므로(`shouldShow`) 평소에는 방해하지 않는다.
 */
export const TOOLBAR_PRESETS: Record<ToolbarMode, ToolbarFeature[]> = {
	full: [
		/*
		 * ⚠️ `'superscript'`·`'subscript'` 는 **일부러 뺐다**(`'card'` 와 같은 방식).
		 * 여기는 수식(KaTeX)이 있어서 `x^2`·`a_i` 같은 표기를 수식이 거의 다 커버한다 —
		 * 굳이 같은 일을 하는 버튼을 인라인 그룹에 하나 더 두면 줄만 길어진다(사용자 결정).
		 * **확장은 계속 등록된다** — 빼면 이미 `<sup>`·`<sub>` 가 든 옛 문서를 열 때
		 * 그 표기가 통째로 날아간다. 넣는 길만 닫은 것이라, 쓰려는 호스트는 `features` 에
		 * 직접 넣으면 된다.
		 */
		'bold', 'italic', 'underline', 'strike', 'highlight',
		'code', 'text-color',
		'align-left', 'align-center', 'align-right',
		'paragraph', 'h1', 'h2', 'h3',
		'bullet-list', 'ordered-list', 'checklist',
		'blockquote', 'horizontal-rule', 'toggle',
		'link', 'image', 'pdf', 'file', 'mbus', 'video',
		'columns-2', 'columns-3', 'tabs', 'table', 'code-block', 'math',
		'undo', 'redo',
		'fixed-toolbar', 'bubble-toolbar', 'slash-menu',
		'table-menu', 'character-count', 'upload-overlay'
	],
	standard: [
		'bold', 'italic', 'underline', 'strike', 'code', 'text-color',
		'align-left', 'align-center', 'align-right',
		'paragraph', 'h1', 'h2', 'h3',
		'bullet-list', 'ordered-list', 'checklist',
		'blockquote', 'horizontal-rule', 'toggle',
		'link', 'image', 'pdf', 'file', 'mbus', 'video',
		'columns-2', 'columns-3', 'tabs', 'table', 'code-block', 'math',
		'fixed-toolbar', 'bubble-toolbar', 'slash-menu', 'table-menu'
	],
	minimal: [
		'bold', 'italic', 'underline', 'strike', 'code', 'text-color',
		'paragraph', 'h2', 'h3',
		'bullet-list', 'ordered-list', 'checklist',
		'blockquote', 'code-block', 'math',
		'link', 'image', 'file', 'pdf', 'video',
		'bubble-toolbar', 'slash-menu'
	]
};

/** features 배열 → Set 변환. features가 있으면 그걸 쓰고 없으면 toolbar 모드 프리셋 */
export function resolveFeatures(
	toolbar: ToolbarMode,
	features?: ToolbarFeature[]
): Set<ToolbarFeature> {
	return new Set(features ?? TOOLBAR_PRESETS[toolbar]);
}

export interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 이미지/PDF 파일 업로드 시 호출. URL을 반환해야 함 */
  onUploadFile?: UploadHandler;
  /** 파일 ID → URL 변환. 하이브리드 파일 저장 시 사용 */
  onResolveFile?: FileResolver;
  /** 링크 URL 프롬프트. 미제공 시 내장 InputModal (FixedToolbar) / window.prompt (BubbleToolbar) 폴백 */
  onPromptLink?: PromptHandler;
  /**
   * 이미지 URL 프롬프트.
   *
   * ⚠️ **`onUploadFile` 을 함께 주면 이건 쓰이지 않는다.** 올릴 수 있는 호스트에게는
   * 업로드/링크 탭이 있는 내장 모달을 띄우기 때문이다(URL 만 받으면 내 컴퓨터의 그림을
   * 넣을 방법이 없다). 업로드를 못 하는 호스트에서만 폴백으로 쓰인다.
   */
  onPromptImage?: PromptHandler;
  /** LaTeX 수식 프롬프트. 미제공 시 내장 MathModal(미리보기 포함) 폴백 */
  onPromptMath?: MathPrompt;
  /** 툴바 모드: 'minimal' | 'standard' | 'full' (기본값 'full') */
  toolbar?: ToolbarMode;
  /** 개별 기능 커스터마이징. 설정 시 toolbar 모드 프리셋 대신 이 배열을 사용 */
  features?: ToolbarFeature[];
}

export interface FixedToolbarProps {
  editor: Editor;
  onPdfClick: () => void;
}

export interface BlockHandleProps {
  editor: Editor;
}

export interface SlashCommandMenuProps {
  editor: Editor;
  query: string;
  onClose: () => void;
  onPdfUpload?: () => void;
}

export interface SlashMenuItem {
  label: string;
  keywords: string;
  icon: Component<{ size?: number }>;
  command: (editor: Editor) => void;
}
