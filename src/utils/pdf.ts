"use client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any = null;
let loading: Promise<unknown> | null = null;

export interface PdfJsConfig {
  /** pdf.min.mjs 경로 (기본: "/pdf.min.mjs") */
  pdfSrc?: string;
  /** pdf.worker.min.mjs 경로 (기본: "/pdf.worker.min.mjs") */
  workerSrc?: string;
}

let config: PdfJsConfig = {};

export function configurePdfJs(cfg: PdfJsConfig) {
  config = cfg;
  // 설정 변경 시 캐시 초기화
  cached = null;
  loading = null;
}

export async function getPdfJs() {
  if (cached) return cached;

  if (!loading) {
    loading = (async () => {
      const pdfSrc = config.pdfSrc || "/pdf.min.mjs";
      const workerSrc = config.workerSrc || "/pdf.worker.min.mjs";

      const res = await fetch(pdfSrc);
      if (!res.ok) throw new Error(`${pdfSrc} 로드 실패`);
      const text = await res.text();
      const blob = new Blob([text], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);

      const mod = await import(/* webpackIgnore: true */ url);
      URL.revokeObjectURL(url);

      const pdfjsLib = mod;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      cached = pdfjsLib;
      return pdfjsLib;
    })();
  }

  return loading;
}
