/**
 * 미디어 리사이즈 툴바 — 미디어 블록을 **선택하면** 그 아래에 뜨는 프리셋 칩 줄.
 * (main 정올 `plugin/resize/index.ts` 1343줄 참조 — 의미 있는 로직만 재작성.)
 *
 * main 에서 가져온 것: 비율 프리셋(16:9·4:3·1:1), 좌/중/우 정렬, 폭 프리셋(100%·50%),
 * "비율을 고르면 고정 높이를 풀고, 높이를 드래그하면 비율을 푼다" 는 배타 규칙.
 * main 에서 **뺀 것**: hover 앵커 + 열고 닫는 상태 기계(여기서는 선택 = 표시라 상태가
 * 필요 없다), 손잡이 겸 토글 버튼(높이 드래그는 각 노드뷰의 `attachResize` 가 맡는다),
 * 드래그 프록시, `data-resize-handler` 로 아무 노드나 끼워 주는 범용 attr 경로,
 * 이미지 전용 rAF 위치 보정. 전부 "코드 크기 대비 얻는 것" 이 없어서다.
 *
 * UI 는 ProseMirror **widget decoration** 으로 세운다 — NodeView 안에 넣으면 노드마다
 * 툴바 DOM 이 상주하지만, 데코레이션은 선택된 하나에만 붙었다 떨어진다.
 *
 * ⚠️ **편집 모드 전용.** `decorations`/`mousedown` 양쪽에서 `editor.isEditable` 을 보고,
 * `TipTapEditor` 도 편집일 때만 이 확장을 싣는다(이중 안전).
 *
 * ⚠️ 크기·정렬은 전부 **노드 속성**으로 저장된다(각 노드의 `renderHTML`/`parseHTML` 이
 * 왕복을 책임진다). 여기서는 `setNodeMarkup` 으로 속성만 바꾼다 — DOM 을 직접 만지면
 * 저장본과 화면이 갈라진다.
 */
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { normalizeMediaAlign, normalizeMediaRatio } from "../utils/media-size";
import { getEditorTranslator } from "../i18n";
const RATIO_PRESETS = ["16:9", "4:3", "1:1"];
const ALIGN_PRESETS = [
    { value: "left", labelKey: "alignLeftShort" },
    { value: "center", labelKey: "alignCenterShort" },
    { value: "right", labelKey: "alignRightShort" }
];
const WIDTH_PRESETS = ["100%", "50%"];
/*
 * ⚠️ 이미지의 `width` 는 단위 없는 px 정수 계약이라(`ResizableImage` 주석) `%` 프리셋을
 * 주면 파싱에서 조용히 버려진다 — 그래서 이미지는 `widthPresets` 를 켜지 않는다.
 * `tiptapMidibus`(정올 prod 강의영상)는 main 과 같게 높이 드래그만 갖고 툴바는 없다 —
 * 저장이 `rawAttrs` 바이트 보존이라 칩이 만드는 속성 변경과 궁합이 나쁘다.
 */
const DEFAULT_TYPES = {
    image: { align: true },
    videoEmbed: { ratio: true, align: true, widthPresets: true },
    mbusVideo: { ratio: true, align: true, widthPresets: true }
};
/**
 * 칩 하나가 만드는 속성 변경. **순수 함수** — 테스트가 이걸 직접 두드린다.
 * 이미 켜진 칩을 다시 누르면 해제(`null`)다. main 의 `Auto` 칩을 재클릭-해제로 접었다.
 */
export function applyMediaToolbarAction(attrs, action, value, config) {
    if (action === "ratio" && config.ratio) {
        const ratio = normalizeMediaRatio(value);
        if (!ratio)
            return null;
        const current = normalizeMediaRatio(attrs.ratio);
        /* 비율을 고르면 고정 높이를 푼다 — 높이가 남아 있으면 비율이 안 먹는다(노드뷰 규칙). */
        return { ...attrs, ratio: ratio === current ? null : ratio, height: null };
    }
    if (action === "align" && config.align) {
        const align = normalizeMediaAlign(value);
        if (!align)
            return null;
        const current = normalizeMediaAlign(attrs.align);
        return { ...attrs, align: align === current ? null : align };
    }
    if (action === "width" && config.widthPresets) {
        if (!WIDTH_PRESETS.includes(value))
            return null;
        return { ...attrs, width: attrs.width === value ? null : value };
    }
    return null;
}
function chip(pos, action, value, label, active) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hce-media-toolbar-chip";
    button.dataset.pos = String(pos);
    button.dataset.action = action;
    button.dataset.value = value;
    button.textContent = label;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    return button;
}
function separator() {
    const span = document.createElement("span");
    span.className = "hce-media-toolbar-separator";
    span.setAttribute("aria-hidden", "true");
    return span;
}
function buildToolbar(pos, node, config, t) {
    /* 높이 0 앵커 — 문서 흐름을 밀지 않고 노드 바로 아래에 띄우기 위한 기준점. */
    const anchor = document.createElement("div");
    anchor.className = "hce-media-toolbar-anchor";
    anchor.contentEditable = "false";
    const toolbar = document.createElement("div");
    toolbar.className = "hce-media-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", t("mediaToolbar"));
    anchor.appendChild(toolbar);
    const groups = [];
    if (config.ratio) {
        const currentRatio = normalizeMediaRatio(node.attrs.ratio);
        groups.push(RATIO_PRESETS.map((preset) => chip(pos, "ratio", preset, preset, currentRatio === preset)));
    }
    if (config.align) {
        const currentAlign = normalizeMediaAlign(node.attrs.align);
        groups.push(ALIGN_PRESETS.map((preset) => chip(pos, "align", preset.value, t(preset.labelKey), currentAlign === preset.value)));
    }
    if (config.widthPresets) {
        groups.push(WIDTH_PRESETS.map((preset) => chip(pos, "width", preset, preset, node.attrs.width === preset)));
    }
    groups.forEach((buttons, index) => {
        if (index > 0)
            toolbar.appendChild(separator());
        buttons.forEach((button) => toolbar.appendChild(button));
    });
    return anchor;
}
/** 속성이 바뀌면 위젯을 다시 그리게 하는 키 — 같은 키면 ProseMirror 가 DOM 을 재사용한다. */
function toolbarKey(pos, node) {
    return `media-toolbar-${pos}-${node.type.name}-${String(node.attrs.width ?? "")}-${String(node.attrs.height ?? "")}-${String(node.attrs.ratio ?? "")}-${String(node.attrs.align ?? "")}`;
}
export const MediaResizeToolbar = Extension.create({
    name: "mediaResizeToolbar",
    addOptions() {
        return { types: DEFAULT_TYPES };
    },
    addProseMirrorPlugins() {
        const getConfig = (node) => this.options.types[node.type.name] ?? null;
        return [
            new Plugin({
                key: new PluginKey("mediaResizeToolbar"),
                props: {
                    decorations: (state) => {
                        /* 읽기 전용에는 절대 안 뜬다. */
                        if (!this.editor.isEditable)
                            return DecorationSet.empty;
                        const { selection } = state;
                        if (!(selection instanceof NodeSelection))
                            return DecorationSet.empty;
                        const config = getConfig(selection.node);
                        if (!config)
                            return DecorationSet.empty;
                        const pos = selection.from;
                        const node = selection.node;
                        return DecorationSet.create(state.doc, [
                            Decoration.widget(pos + node.nodeSize, () => buildToolbar(pos, node, config, getEditorTranslator(this.editor)), { side: 1, key: toolbarKey(pos, node) })
                        ]);
                    },
                    handleDOMEvents: {
                        /*
                         * click 이 아니라 mousedown 이다 — 에디터가 mousedown 에서 선택을
                         * 옮기면 데코레이션이 사라져 click 이 영영 도착하지 않는다.
                         */
                        mousedown: (view, event) => {
                            if (!this.editor.isEditable)
                                return false;
                            if (!(event.target instanceof HTMLElement))
                                return false;
                            const button = event.target.closest(".hce-media-toolbar-chip");
                            if (!button)
                                return false;
                            event.preventDefault();
                            event.stopPropagation();
                            const pos = Number.parseInt(button.dataset.pos || "", 10);
                            if (!Number.isFinite(pos))
                                return true;
                            const node = view.state.doc.nodeAt(pos);
                            if (!node)
                                return true;
                            const config = getConfig(node);
                            if (!config)
                                return true;
                            const nextAttrs = applyMediaToolbarAction(node.attrs, button.dataset.action || "", button.dataset.value || "", config);
                            if (!nextAttrs)
                                return true;
                            const tr = view.state.tr.setNodeMarkup(pos, undefined, nextAttrs);
                            /* 선택을 유지해야 툴바가 새 상태로 다시 그려진다. */
                            const nodeSelection = (() => {
                                try {
                                    return NodeSelection.create(tr.doc, pos);
                                }
                                catch {
                                    return null;
                                }
                            })();
                            if (nodeSelection)
                                tr.setSelection(nodeSelection);
                            view.dispatch(tr);
                            return true;
                        }
                    }
                }
            })
        ];
    }
});
