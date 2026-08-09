"use client";

import { Download, Minus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  dataUrl?: string;
  mime?: string;
  fileName?: string;
  /** Fallback when no dataUrl — show extracted text */
  textFallback?: string;
};

export function PdfViewer({ open, onClose, title, dataUrl, mime, fileName, textFallback }: Props) {
  const [zoom, setZoom] = useState(100);
  const isPdf = Boolean(
    dataUrl && (mime?.includes("pdf") || dataUrl.startsWith("data:application/pdf") || fileName?.toLowerCase().endsWith(".pdf"))
  );
  const isImage = Boolean(dataUrl && (mime?.startsWith("image/") || dataUrl.startsWith("data:image")));

  const src = useMemo(() => {
    if (!dataUrl || !isPdf) return dataUrl;
    // Hint browser PDF viewer UI where supported
    return dataUrl.includes("#") ? dataUrl : `${dataUrl}#toolbar=1&navpanes=0`;
  }, [dataUrl, isPdf]);

  if (!open) return null;

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName || title || "document";
    a.rel = "noreferrer";
    a.click();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 md:p-6">
      <div className="surface flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden p-3 md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="truncate font-semibold">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {isPdf && (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => setZoom((z) => Math.max(50, z - 10))} aria-label="Zoom out">
                  <Minus size={16} />
                </button>
                <span className="text-sm text-ink-muted">{zoom}%</span>
                <button type="button" className="btn btn-secondary" onClick={() => setZoom((z) => Math.min(200, z + 10))} aria-label="Zoom in">
                  <Plus size={16} />
                </button>
              </>
            )}
            {dataUrl && (
              <button type="button" className="btn btn-secondary" onClick={download}>
                <Download size={16} /> Download
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-bg-elevated">
          {isPdf && src ? (
            <iframe
              title={title}
              src={src}
              className="h-full min-h-[70vh] w-full origin-top-left border-0 bg-white"
              style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
            />
          ) : isImage && dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={title} className="mx-auto max-h-full object-contain p-4" style={{ width: `${zoom}%` }} />
          ) : (
            <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed">
              {textFallback ||
                "No in-app preview available for this file. Use Download if a copy was stored, or re-upload under ~4MB."}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
