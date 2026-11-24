import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

// Configure pdf.js worker locally via Vite asset URL so PDFs parse 100% offline/client-side
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: string;
  pageCount?: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB upload cap

/**
 * Extracts plain text from .txt, .log, .md, .csv, .json, .pdf, and .docx files locally in the browser.
 */
export async function parseIncidentFile(file: File): Promise<ParsedDocument> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the 10 MB limit. Please upload a smaller report.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["txt", "log", "md", "csv", "json", "eml", "xml", "stix"].includes(ext) || file.type.startsWith("text/")) {
    const text = await file.text();
    return {
      text,
      fileName: file.name,
      fileType: ext.toUpperCase() || "TEXT",
    };
  }

  if (ext === "pdf" || file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean);
      pages.push(strings.join(" "));
    }

    return {
      text: pages.join("\n\n"),
      fileName: file.name,
      fileType: "PDF",
      pageCount: pdf.numPages,
    };
  }

  if (
    ext === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
      text: result.value,
      fileName: file.name,
      fileType: "DOCX",
    };
  }

  throw new Error(`Unsupported file format ".${ext}". Supported formats: .txt, .log, .pdf, .docx.`);
}
