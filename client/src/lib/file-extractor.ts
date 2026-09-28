import * as pdfjsLib from "pdfjs-dist";
import { recognize } from "tesseract.js";

// Configure pdfjs worker
// Use unpkg CDN or bundled worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ExtractionProgress {
  stage: "reading" | "ocr" | "done" | "error";
  progress: number; // 0 - 100
  message: string;
}

/**
 * Extract text from a PDF file page by page
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (p: ExtractionProgress) => void
): Promise<string> {
  onProgress?.({ stage: "reading", progress: 10, message: "Loading PDF document…" });

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  const totalPages = pdfDoc.numPages;
  const textPieces: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      stage: "reading",
      progress: Math.round((pageNum / totalPages) * 85) + 10,
      message: `Extracting page ${pageNum} of ${totalPages}…`,
    });

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items with newline awareness
    const pageText = textContent.items
      .map((item: any) => item.str || "")
      .join(" ");

    textPieces.push(pageText);
  }

  onProgress?.({ stage: "done", progress: 100, message: "PDF text extracted successfully!" });
  return textPieces.join("\n\n");
}

/**
 * Extract text from an Image file (PNG, JPG, WebP) using Tesseract.js OCR
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (p: ExtractionProgress) => void
): Promise<string> {
  onProgress?.({ stage: "ocr", progress: 5, message: "Initializing OCR engine…" });

  const result = await recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const pct = Math.round((m.progress || 0) * 85) + 10;
        onProgress?.({
          stage: "ocr",
          progress: pct,
          message: `Reading text from syllabus image (${pct}%)…`,
        });
      }
    },
  });

  onProgress?.({ stage: "done", progress: 100, message: "Image OCR complete!" });
  return result.data.text || "";
}

/**
 * Auto-detect file type and extract text
 */
export async function extractSyllabusFromFile(
  file: File,
  onProgress?: (p: ExtractionProgress) => void
): Promise<{ text: string; fileName: string; type: "pdf" | "image" }> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);

  if (isPdf) {
    const text = await extractTextFromPdf(file, onProgress);
    return { text, fileName: file.name, type: "pdf" };
  }

  if (isImage) {
    const text = await extractTextFromImage(file, onProgress);
    return { text, fileName: file.name, type: "image" };
  }

  throw new Error("Unsupported file format. Please upload a PDF or an Image (PNG, JPG, WebP).");
}

