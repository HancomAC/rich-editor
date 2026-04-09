/** 모드별 기본 feature 프리셋 */
export const TOOLBAR_PRESETS = {
    full: [
        'bold', 'italic', 'underline', 'strike', 'highlight',
        'superscript', 'subscript', 'code',
        'align-left', 'align-center', 'align-right',
        'h1', 'h2', 'h3',
        'bullet-list', 'ordered-list', 'checklist',
        'blockquote', 'horizontal-rule', 'toggle',
        'link', 'image', 'pdf', 'youtube', 'video', 'file',
        'columns-2', 'columns-3', 'table', 'code-block',
        'undo', 'redo',
        'fixed-toolbar', 'bubble-toolbar', 'slash-menu',
        'table-menu', 'character-count', 'upload-overlay'
    ],
    standard: [
        'bold', 'italic', 'strike', 'code',
        'h1', 'h2', 'h3',
        'bullet-list', 'ordered-list', 'checklist',
        'blockquote', 'horizontal-rule', 'toggle',
        'link', 'image', 'pdf', 'youtube', 'video', 'file',
        'columns-2', 'columns-3', 'table', 'code-block',
        'fixed-toolbar', 'bubble-toolbar', 'slash-menu', 'table-menu'
    ],
    minimal: [
        'bold', 'italic', 'strike', 'code',
        'link',
        'bubble-toolbar', 'slash-menu'
    ]
};
/** features 배열 → Set 변환. features가 있으면 그걸 쓰고 없으면 toolbar 모드 프리셋 */
export function resolveFeatures(toolbar, features) {
    return new Set(features ?? TOOLBAR_PRESETS[toolbar]);
}
