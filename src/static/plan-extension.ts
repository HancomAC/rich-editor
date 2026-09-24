import { STATIC_NODE_VIEW, type StaticNodeViewRenderer } from "tiptap-static/protocol";
import type { StaticNodePlan, TiptapExtensionLike } from "tiptap-static";

export function planAsExtension(plan: StaticNodePlan): TiptapExtensionLike {
  const renderer = (() => {
    throw new Error("Prepared NodeViews must be mounted through their static hook.");
  }) as StaticNodeViewRenderer;
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
            ? (element: HTMLElement) => {
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
