import { createStaticRenderer } from "tiptap-static";
import { planAsExtension } from "./plan-extension";
export function createFullStaticRenderer(nodes, extensions, sanitize) {
    const names = new Set(extensions.map((extension) => extension.name));
    const builtins = nodes
        .filter((plan) => !names.has(plan.name))
        .map(planAsExtension);
    return createStaticRenderer({
        extensions: [...builtins, ...extensions],
        rawNodeViews: true,
        sanitize,
    });
}
