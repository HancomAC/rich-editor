import { Plugin } from "@tiptap/pm/state";
/**
 * 업스트림 코드블록의 VS Code 붙여넣기 처리를 **메타데이터 검증으로 감싼다**.
 *
 * ⚠️ 왜 필요한가 — VS Code 계열 앱은 복사할 때 클립보드에 `vscode-editor-data`(JSON)를
 * 싣는데, `@tiptap/extension-code-block` 의 `codeBlockVSCodeHandler` 는 이것을 **검증 없이
 * `JSON.parse`** 한다(dist/index.js `const vscodeData = vscode ? JSON.parse(vscode) : ...`).
 * 다른 앱이 같은 타입에 깨진 값을 실어 보내면 붙여넣기 한 번에 handlePaste 가 던지고,
 * 그 뒤로 에디터가 멈춘다.
 *
 * 업스트림 플러그인을 갈아 끼우지 않고 **그대로 감싼다** — 붙여넣기 동작과 플러그인
 * 정체(키·나머지 props)는 유지하고, 메타데이터가 멀쩡할 때만 원래 핸들러에 넘긴다.
 * 메타데이터가 깨졌으면 false 를 돌려 **일반 텍스트 붙여넣기로** 내려보낸다.
 *
 * handlePaste 가 없는 플러그인은 손대지 않고 그대로 돌려주므로, 코드블록의 부모 플러그인
 * 전부에 일괄로 씌워도 안전하다.
 */
export function guardVSCodePaste(plugin) {
    const handlePaste = plugin.spec.props?.handlePaste;
    if (!handlePaste)
        return plugin;
    return new Plugin({
        ...plugin.spec,
        props: {
            ...plugin.spec.props,
            handlePaste(view, event, slice) {
                const metadata = event.clipboardData?.getData("vscode-editor-data");
                if (metadata) {
                    try {
                        const data = JSON.parse(metadata);
                        if (!data ||
                            typeof data !== "object" ||
                            !("mode" in data) ||
                            typeof data.mode !== "string") {
                            return false;
                        }
                    }
                    catch {
                        return false;
                    }
                }
                return handlePaste.call(this, view, event, slice);
            }
        }
    });
}
