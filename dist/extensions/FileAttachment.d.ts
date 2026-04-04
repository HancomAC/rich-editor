import { Node } from "@tiptap/core";
export interface FileAttachmentOptions {
    HTMLAttributes: Record<string, unknown>;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        fileAttachment: {
            setFileAttachment: (attrs: {
                src: string;
                name: string;
                size?: number;
            }) => ReturnType;
        };
    }
}
export declare const FileAttachment: Node<FileAttachmentOptions, any>;
//# sourceMappingURL=FileAttachment.d.ts.map