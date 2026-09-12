import { Extension } from '@tiptap/core';
import { ko, type EditorMessages, type EditorMessageKey } from './ko';
import { en } from './en';
import { ja } from './ja';
import { es } from './es';
import { zhHans } from './zh-hans';
import { zhHant } from './zh-hant';
export type { EditorMessages, EditorMessageKey };
export { ko, en, ja, es, zhHans, zhHant };
/** 호스트가 주입하는 값 — 로케일 코드('ko'·'en-US'·'zh-TW'…) 또는 부분 메시지 오버라이드. */
export type EditorLocaleInput = string | Partial<EditorMessages> | null | undefined;
/** 번역 함수. `{name}` 자리는 `params` 로 채운다. */
export type EditorTranslator = (key: EditorMessageKey, params?: Record<string, string | number>) => string;
/**
 * 번역 함수를 만든다.
 * - 문자열: 로케일 코드로 해석 (미해석 시 ko)
 * - 객체: 부분 오버라이드 — 없는 키는 ko 로 폴백
 * - null/undefined: ko (기존 동작 그대로)
 */
export declare function createTranslator(locale?: EditorLocaleInput): EditorTranslator;
/** 미주입 기본 — ko. 확장이 에디터 밖(스토리지 없음)에서 쓰일 때의 폴백이기도 하다. */
export declare const defaultTranslator: EditorTranslator;
export interface EditorI18nOptions {
    locale: EditorLocaleInput;
}
export interface EditorI18nStorage {
    /** 현재 번역 함수. NodeView 는 `getEditorTranslator(editor)` 로 읽는다. */
    t: EditorTranslator;
}
/**
 * 번역 함수를 `editor.storage.editorI18n.t` 에 실어 주는 확장.
 * `TipTapEditor` 가 `locale` prop 으로 등록하지만, 확장을 직접 조립하는 호스트도
 * `EditorI18n.configure({ locale })` 로 같은 효과를 얻는다.
 */
export declare const EditorI18n: Extension<EditorI18nOptions, EditorI18nStorage>;
/**
 * vanilla NodeView 용 접근자. 에디터에 `EditorI18n` 이 없으면(단독 사용·구버전 호스트)
 * ko 기본 번역기를 돌려줘 기존 렌더와 동일하게 동작한다.
 */
export declare function getEditorTranslator(editor: {
    storage?: unknown;
} | null | undefined): EditorTranslator;
//# sourceMappingURL=index.d.ts.map