export interface PdfJsConfig {
    /** pdf.min.mjs 경로 (기본: "/pdf.min.mjs") */
    pdfSrc?: string;
    /** pdf.worker.min.mjs 경로 (기본: "/pdf.worker.min.mjs") */
    workerSrc?: string;
}
export declare function configurePdfJs(cfg: PdfJsConfig): void;
export declare function getPdfJs(): Promise<any>;
//# sourceMappingURL=pdf.d.ts.map