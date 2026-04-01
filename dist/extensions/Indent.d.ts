import { Extension } from "@tiptap/core";
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        indent: {
            indent: () => ReturnType;
            outdent: () => ReturnType;
        };
    }
}
export declare const Indent: Extension<any, any>;
//# sourceMappingURL=Indent.d.ts.map