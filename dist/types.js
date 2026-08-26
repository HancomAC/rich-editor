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
 */
export const TOOLBAR_PRESETS = {
    full: [
        'bold', 'italic', 'underline', 'strike', 'highlight',
        'superscript', 'subscript', 'code', 'text-color',
        'align-left', 'align-center', 'align-right',
        'paragraph', 'h1', 'h2', 'h3',
        'bullet-list', 'ordered-list', 'checklist',
        'blockquote', 'horizontal-rule', 'toggle',
        'link', 'image', 'pdf', 'file', 'mbus',
        'columns-2', 'columns-3', 'table', 'code-block', 'math',
        'undo', 'redo',
        'fixed-toolbar', 'slash-menu',
        'table-menu', 'character-count', 'upload-overlay'
    ],
    standard: [
        'bold', 'italic', 'underline', 'strike', 'code', 'text-color',
        'align-left', 'align-center', 'align-right',
        'paragraph', 'h1', 'h2', 'h3',
        'bullet-list', 'ordered-list', 'checklist',
        'blockquote', 'horizontal-rule', 'toggle',
        'link', 'image', 'pdf', 'file', 'mbus',
        'columns-2', 'columns-3', 'table', 'code-block', 'math',
        'fixed-toolbar', 'slash-menu', 'table-menu'
    ],
    minimal: [
        'bold', 'italic', 'underline', 'strike', 'code', 'text-color',
        'paragraph', 'h2', 'h3',
        'bullet-list', 'ordered-list', 'checklist',
        'blockquote', 'code-block', 'math',
        'link', 'image', 'file', 'pdf',
        'bubble-toolbar', 'slash-menu'
    ]
};
/** features 배열 → Set 변환. features가 있으면 그걸 쓰고 없으면 toolbar 모드 프리셋 */
export function resolveFeatures(toolbar, features) {
    return new Set(features ?? TOOLBAR_PRESETS[toolbar]);
}
