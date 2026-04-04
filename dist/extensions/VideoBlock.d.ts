import { Node } from "@tiptap/core";
export interface VideoBlockOptions {
    HTMLAttributes: Record<string, unknown>;
}
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        videoBlock: {
            setVideoBlock: (attrs: {
                src: string;
                name?: string;
            }) => ReturnType;
        };
    }
}
export declare const VideoBlock: Node<VideoBlockOptions, any>;
//# sourceMappingURL=VideoBlock.d.ts.map