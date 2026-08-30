import type { StaticNodePlan } from "tiptap-static";
export type StaticFileResolver = (fileId: string) => Promise<{
    src: string;
    name?: string;
    size?: number;
}>;
export interface BuiltinStaticNodeOptions {
    resolver?: StaticFileResolver;
    downloadBaseUrl?: string;
}
export declare function createBuiltinStaticNodes(options?: BuiltinStaticNodeOptions): readonly StaticNodePlan[];
export declare const builtinStaticNodes: readonly StaticNodePlan[];
//# sourceMappingURL=builtin-nodes.d.ts.map