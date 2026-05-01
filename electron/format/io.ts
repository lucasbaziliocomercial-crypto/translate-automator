import * as path from "path";
import { importDocxToMarkdown } from "./docx-import";
import { importPdfToMarkdown } from "./pdf-import";
import { exportMarkdownToDocx } from "./docx-export";
import { exportMarkdownToPdf } from "./pdf-export";

export type SupportedFormat = "docx" | "pdf";

export function detectFormat(filePath: string): SupportedFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".docx") return "docx";
  if (ext === ".pdf") return "pdf";
  return null;
}

export async function importFile(
  filePath: string,
): Promise<{ format: SupportedFormat; markdown: string }> {
  const format = detectFormat(filePath);
  if (!format) throw new Error(`Formato não suportado: ${path.extname(filePath)}`);

  if (format === "docx") {
    return { format, markdown: await importDocxToMarkdown(filePath) };
  }
  return { format, markdown: await importPdfToMarkdown(filePath) };
}

export async function exportFile(
  filePath: string,
  markdown: string,
): Promise<void> {
  const format = detectFormat(filePath);
  if (!format) throw new Error(`Formato de exportação não suportado: ${path.extname(filePath)}`);

  if (format === "docx") {
    await exportMarkdownToDocx(markdown, filePath);
    return;
  }
  await exportMarkdownToPdf(markdown, filePath);
}
