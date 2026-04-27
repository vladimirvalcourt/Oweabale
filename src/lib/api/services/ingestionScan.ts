/**
 * Review Inbox — extract text from images and PDFs (text layer + raster OCR fallback).
 * Scanned PDFs have no text layer; we render pages to canvas and run Tesseract.
 */
// Heavy OCR libs (~7MB gzipped combined) are loaded on-demand so they stay out of the
// initial bundle and only reach users who actually scan a document.
import type { PDFDocumentProxy } from 'pdfjs-dist';
type TesseractModule = typeof import('tesseract.js');

let tesseractModPromise: Promise<TesseractModule> | null = null;
async function loadTesseract(): Promise<TesseractModule> {
  if (!tesseractModPromise) {
    tesseractModPromise = import('tesseract.js');
  }
  return tesseractModPromise;
}

async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfjsWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  }
  return pdfjsLib;
}

/** Below this trimmed length, PDF text layer is treated as unusable → raster OCR. */
const WEAK_PDF_TEXT_MAX_CHARS = 90;
const DEFAULT_MAX_RASTER_PAGES = 5;
/** Viewport scale for rasterization (quality vs speed). */
const RASTER_SCALE = 1.75;

function isWeakPdfTextLayer(text: string): boolean {
  const t = text.trim();
  if (t.length < WEAK_PDF_TEXT_MAX_CHARS) return true;
  if (!/\d/.test(t)) return true;
  return false;
}

async function extractPdfTextLayer(pdf: PDFDocumentProxy): Promise<string> {
  let full = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .join(' ');
    full += strings + '\n';
  }
  return full;
}

async function ocrPdfPagesRaster(
  pdf: PDFDocumentProxy,
  maxPages: number,
  onPage?: (pageIndex: number, totalPages: number) => void
): Promise<string> {
  const n = Math.min(pdf.numPages, maxPages);
  const parts: string[] = [];
  for (let i = 1; i <= n; i++) {
    onPage?.(i, n);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RASTER_SCALE });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const task = page.render({ canvasContext: ctx, viewport, canvas });
    await task.promise;
    const Tesseract = await loadTesseract();
    const result = await Tesseract.recognize(canvas, 'eng');
    parts.push(result.data.text);
  }
  return parts.join('\n\n');
}

export type ExtractDocumentTextResult = {
  text: string;
  /** True when PDF had a weak/empty text layer and we used per-page raster OCR. */
  usedRasterPdfOcr: boolean;
};

/**
 * Images → Tesseract. PDFs → text layer first; if weak, rasterize pages and OCR.
 */
export async function extractDocumentText(
  file: File,
  options?: {
    onStatus?: (label: string) => void;
    maxRasterPdfPages?: number;
  }
): Promise<ExtractDocumentTextResult> {
  const maxRaster = options?.maxRasterPdfPages ?? DEFAULT_MAX_RASTER_PAGES;
  const onStatus = options?.onStatus;

  if (file.type.startsWith('image/')) {
    onStatus?.('scanning');
    const Tesseract = await loadTesseract();
    const result = await Tesseract.recognize(file, 'eng');
    return { text: result.data.text, usedRasterPdfOcr: false };
  }

  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    onStatus?.('scanning');
    let text = await extractPdfTextLayer(pdf);
    let usedRasterPdfOcr = false;
    if (isWeakPdfTextLayer(text)) {
      usedRasterPdfOcr = true;
      text = await ocrPdfPagesRaster(pdf, maxRaster, (i, total) => {
        onStatus?.(`scanning [P${i}/${total}]`);
      });
    }
    return { text, usedRasterPdfOcr };
  }

  return { text: '', usedRasterPdfOcr: false };
}
