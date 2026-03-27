"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPdfJs } from "../utils/pdf";

interface PdfViewerProps {
  src: string;
  fileName?: string;
}

export function PdfViewer({ src, fileName }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(false);
        setPdf(null);
        setPage(1);
        const pdfjsLib = await getPdfJs();
        const loadingTask = pdfjsLib.getDocument(src);
        const pdfDoc = await loadingTask.promise;
        if (!cancelled) {
          setPdf(pdfDoc);
          setTotal(pdfDoc.numPages);
          setLoading(false);
        }
      } catch (e) {
        console.error("[PdfViewer] PDF 로드 실패:", src, e);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [src]);

  const renderingRef = useRef(false);

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return;
    if (renderingRef.current) return;
    renderingRef.current = true;

    try {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pageObj = await pdf.getPage(page);
      const unscaledViewport = pageObj.getViewport({ scale: 1 });

      const availableWidth = container.clientWidth - 32;
      if (availableWidth <= 0) return;

      const scale = availableWidth / unscaledViewport.width;
      const viewport = pageObj.getViewport({ scale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      await pageObj.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      renderingRef.current = false;
    }
  }, [pdf, page]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  useEffect(() => {
    if (!pdf) return;
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(renderPage, 100);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [pdf, renderPage]);

  if (error) {
    return (
      <div className="border border-border rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">PDF를 불러올 수 없습니다.</p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          직접 다운로드
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">PDF 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-muted/30 my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <span className="text-xs text-muted-foreground truncate">
          {fileName || "PDF 문서"}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {page} / {total}
        </span>
      </div>

      <div ref={containerRef} className="flex items-center justify-center p-4 bg-neutral-100 dark:bg-neutral-900">
        <canvas ref={canvasRef} className="shadow-sm" />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-border bg-background">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30"
            title="이전 페이지"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm tabular-nums">
            {page} / {total}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(total, p + 1))}
            disabled={page >= total}
            className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-30"
            title="다음 페이지"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
