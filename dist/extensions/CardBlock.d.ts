import { Node } from "@tiptap/core";
/** 배경 문자열을 받아 새 값(취소면 null)을 돌려주는 호스트 훅. */
export type CardBackgroundPrompt = (current: string) => Promise<string | null>;
export interface CardBlockOptions {
    HTMLAttributes: Record<string, unknown>;
    promptBackground: CardBackgroundPrompt | null;
}
export declare const CardBlock: Node<CardBlockOptions, any>;
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        card: {
            setCard: (attrs?: {
                title?: string;
                background?: string;
                height?: string;
            }) => ReturnType;
        };
    }
}
//# sourceMappingURL=CardBlock.d.ts.map