/**
 * Client-side .docx / .pdf → plain text for workflow wizard context.
 */

export type WorkflowDocumentKind = "docx" | "pdf";

export const WORKFLOW_DOCUMENT_ACCEPT =
  ".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf";

export function getWorkflowDocumentKind(file: File): WorkflowDocumentKind | null {
  const name = file.name.toLowerCase();
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return "pdf";
  }
  return null;
}

export function isSupportedWorkflowDocument(file: File): boolean {
  return getWorkflowDocumentKind(file) !== null;
}

/** @deprecated use isSupportedWorkflowDocument */
export function isDocxFile(file: File): boolean {
  return getWorkflowDocumentKind(file) === "docx";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function parseDocxFile(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

let pdfWorkerConfigured = false;

async function configurePdfWorker(pdfjs: typeof import("pdfjs-dist")): Promise<void> {
  if (pdfWorkerConfigured && pdfjs.GlobalWorkerOptions.workerSrc) return;
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  pdfWorkerConfigured = true;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  await configurePdfWorker(pdfjs);

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) parts.push(pageText);
  }

  return parts.join("\n\n").trim();
}

export async function extractTextFromWorkflowDocument(file: File): Promise<string> {
  const kind = getWorkflowDocumentKind(file);
  if (!kind) {
    throw new Error("Unsupported file type");
  }
  if (kind === "docx") {
    return parseDocxFile(file);
  }
  return extractTextFromPdf(file);
}

/** @deprecated use extractTextFromWorkflowDocument */
export async function extractTextFromDocx(file: File): Promise<string> {
  if (getWorkflowDocumentKind(file) !== "docx") {
    throw new Error("Not a .docx file");
  }
  return parseDocxFile(file);
}
