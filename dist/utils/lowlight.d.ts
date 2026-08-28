/** 등록하는 언어 이름. 테스트가 이 목록으로 실제 등록분을 검사한다. */
export declare const CODE_LANGUAGES: readonly ["cpp", "java", "python", "javascript", "typescript", "kotlin", "go", "csharp", "rust", "sql", "pgsql", "graphql", "xml", "css", "json", "yaml", "bash", "shell", "makefile", "ini", "diff"];
export declare const lowlight: {
    highlight: (language: string, value: string, options?: Readonly<import("lowlight").Options> | null | undefined) => import("hast").Root;
    highlightAuto: (value: string, options?: Readonly<import("lowlight").AutoOptions> | null | undefined) => import("hast").Root;
    listLanguages: () => Array<string>;
    register: {
        (grammars: Readonly<Record<string, import("highlight.js").LanguageFn>>): undefined;
        (name: string, grammar: import("highlight.js").LanguageFn): undefined;
    };
    registerAlias: {
        (aliases: Readonly<Record<string, ReadonlyArray<string> | string>>): undefined;
        (language: string, alias: ReadonlyArray<string> | string): undefined;
    };
    registered: (aliasOrName: string) => boolean;
};
//# sourceMappingURL=lowlight.d.ts.map