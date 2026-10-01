import { createStaticRenderer, type StaticRenderer } from "tiptap-static";
import type {
  StaticNodePlan,
  StaticSanitizeOptions,
  TiptapExtensionLike,
} from "tiptap-static";
import { planAsExtension } from "./plan-extension";

export function createFullStaticRenderer(
  nodes: readonly StaticNodePlan[],
  extensions: readonly TiptapExtensionLike[],
  sanitize: StaticSanitizeOptions,
): StaticRenderer {
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
