import { STATIC_NODE_VIEW } from "tiptap-static/protocol";
export function planAsExtension(plan) {
    const renderer = (() => {
        throw new Error("Prepared NodeViews must be mounted through their static hook.");
    });
    Object.defineProperty(renderer, STATIC_NODE_VIEW, {
        configurable: true,
        value: plan.nodeView,
    });
    return {
        name: plan.name,
        type: "node",
        options: plan.options ?? {},
        storage: plan.storage ?? {},
        config: {
            inline: plan.type.isInline ?? false,
            atom: plan.type.isAtom ?? plan.type.isLeaf,
            content: plan.type.spec?.content,
            parseHTML() {
                return plan.rules.map((rule) => ({
                    tag: rule.selector,
                    namespace: rule.namespace,
                    contentElement: rule.contentElement,
                    getAttrs: rule.parse
                        ? (element) => {
                            const match = rule.parse?.(element);
                            return match === false ? false : (match?.attrs ?? {});
                        }
                        : undefined,
                }));
            },
            addNodeView() {
                return renderer;
            },
        },
    };
}
