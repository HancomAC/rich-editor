/*
 * 에디터 UI 문자열 i18n.
 *
 * 구조는 main(trinity `packages/tiptap`의 `editor/i18n`)의 메커니즘을 따르되 이 패키지의
 * 계약에 맞게 두 가지를 바꿨다:
 *
 * 1. **폴백이 ko 다** (main 은 en). 이 패키지는 로케일 없이 쓰이던 기존 호스트
 *    (jungol 0.10.7 · codepass 0.10.2)와의 **픽셀 단위 하위호환**이 절대 조건이라,
 *    미주입·미해석 로케일·미정의 키 전부 ko 로 떨어진다. `navigator.language` 도
 *    읽지 않는다 — 같은 이유다(브라우저 언어에 따라 미주입 화면이 달라지면 안 된다).
 * 2. **vanilla NodeView 접근 경로.** Svelte 컨텍스트는 확장(PdfBlock·TabsBlock 등
 *    vanilla DOM NodeView)까지 닿지 않으므로, `EditorI18n` 확장이 번역 함수를
 *    `editor.storage.editorI18n.t` 에 실어 두고 NodeView 는 `getEditorTranslator(editor)`
 *    로 꺼낸다. 확장을 단독으로 쓰는 호스트(스토리지 없음)는 ko 폴백을 받는다.
 *
 * 사전은 6개 로케일 전부 정적 import 다 — 근거: (1) 문자열이 읽기 전용 경로(PDF 뷰어·
 * 파일 첨부 등 정적 import 확장)에도 살아 있어 지연 로딩이면 ko 가 먼저 찍혔다가 바뀌는
 * 깜빡임이 생기고, (2) 전체 원문 크기가 로케일당 ~4KB(6개 ~25KB raw, gzip 한 자릿수 KB)로
 * 패키지가 이미 끄는 그래프(2.06MB raw)의 1% 남짓이라 분리 비용이 이득을 넘는다.
 */
import { Extension } from '@tiptap/core';
import { ko } from './ko';
import { en } from './en';
import { ja } from './ja';
import { es } from './es';
import { zhHans } from './zh-hans';
import { zhHant } from './zh-hant';
export { ko, en, ja, es, zhHans, zhHant };
const LOCALES = {
    ko,
    en,
    ja,
    es,
    'zh-hans': zhHans,
    'zh-hant': zhHant
};
/*
 * 로케일 코드 정규화 — main 과 같은 규칙. `_` → `-`, 소문자화, 중국어는 문자 체계로
 * 이분한다(hant·TW·HK·MO → hant, 나머지 → hans).
 */
function normalizeLocaleCode(value) {
    const normalized = value.trim().replace(/_/g, '-').toLowerCase();
    if (!normalized.startsWith('zh'))
        return normalized;
    if (normalized.includes('hant') ||
        normalized.startsWith('zh-tw') ||
        normalized.startsWith('zh-hk') ||
        normalized.startsWith('zh-mo')) {
        return 'zh-hant';
    }
    return 'zh-hans';
}
/** 코드 → 사전. 정확 일치 → 첫 서브태그 일치('en-GB'→en) → **ko**(하위호환 폴백). */
function messagesForCode(code) {
    const normalized = normalizeLocaleCode(code);
    if (!normalized)
        return ko;
    const exact = LOCALES[normalized];
    if (exact)
        return exact;
    const primary = normalized.split('-')[0];
    return LOCALES[primary] ?? ko;
}
function interpolate(template, params) {
    if (!params)
        return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
}
/**
 * 번역 함수를 만든다.
 * - 문자열: 로케일 코드로 해석 (미해석 시 ko)
 * - 객체: 부분 오버라이드 — 없는 키는 ko 로 폴백
 * - null/undefined: ko (기존 동작 그대로)
 */
export function createTranslator(locale) {
    const overrides = locale && typeof locale === 'object' ? locale : null;
    const messages = typeof locale === 'string' ? messagesForCode(locale) : ko;
    return (key, params) => {
        const template = overrides?.[key] ?? messages[key] ?? ko[key] ?? key;
        return interpolate(template, params);
    };
}
/** 미주입 기본 — ko. 확장이 에디터 밖(스토리지 없음)에서 쓰일 때의 폴백이기도 하다. */
export const defaultTranslator = createTranslator();
/**
 * 번역 함수를 `editor.storage.editorI18n.t` 에 실어 주는 확장.
 * `TipTapEditor` 가 `locale` prop 으로 등록하지만, 확장을 직접 조립하는 호스트도
 * `EditorI18n.configure({ locale })` 로 같은 효과를 얻는다.
 */
export const EditorI18n = Extension.create({
    name: 'editorI18n',
    addOptions() {
        return { locale: null };
    },
    addStorage() {
        return { t: defaultTranslator };
    },
    onBeforeCreate() {
        this.storage.t = createTranslator(this.options.locale);
    }
});
/**
 * vanilla NodeView 용 접근자. 에디터에 `EditorI18n` 이 없으면(단독 사용·구버전 호스트)
 * ko 기본 번역기를 돌려줘 기존 렌더와 동일하게 동작한다.
 */
export function getEditorTranslator(editor) {
    const storage = editor?.storage;
    return storage?.editorI18n?.t ?? defaultTranslator;
}
