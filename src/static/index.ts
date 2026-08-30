export { default as StaticTipTap } from "../components/StaticTipTap.svelte";
export { createStaticSanitizePolicy } from "./policy";
export { builtinStaticNodes, createBuiltinStaticNodes } from "./builtin-nodes";
export type { BuiltinStaticNodeOptions, StaticFileResolver } from "./builtin-nodes";
export type { StaticTipTapProps } from "../types";
export type {
  StaticHydrationMatch,
  StaticHydrationNodeType,
  StaticHydrationRule,
  StaticNodePlan,
} from "tiptap-static/hydrate";
export type { StaticNodeViewProps } from "tiptap-static/protocol";
export type { StaticSanitizeOptions } from "tiptap-static";
