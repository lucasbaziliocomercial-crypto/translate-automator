import { BrowserWindow } from "electron";
import * as fs from "fs";
import {
  detectMaleLeadName,
  findMmcParagraphLineRanges,
  isLineInRanges,
  MMC_HIGHLIGHT_HEX,
} from "./highlight-mmc";

/**
 * Exporta markdown traduzido como PDF.
 * Strategy: renderiza HTML offscreen num BrowserWindow com a formatação correta
 * (incluindo highlight verde do MMC), depois usa printToPDF do Chromium.
 */
export async function exportMarkdownToPdf(
  markdown: string,
  outputPath: string,
): Promise<void> {
  const html = markdownToHtml(markdown);
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true },
  });
  try {
    const dataUrl =
      "data:text/html;charset=utf-8," + encodeURIComponent(html);
    await win.loadURL(dataUrl);
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
      pageSize: "A4",
    });
    fs.writeFileSync(outputPath, pdf);
  } finally {
    win.destroy();
  }
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const maleLead = detectMaleLeadName(markdown);
  const mmcRanges = maleLead ? findMmcParagraphLineRanges(lines, maleLead) : [];

  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHighlight = isLineInRanges(i, mmcRanges);

    if (line.trim() === "") {
      blocks.push("");
      continue;
    }
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/);
    const oli = line.match(/^(\d+)\.\s+(.+)$/);

    const inline = (s: string) => inlineFormat(escapeHtml(s));

    if (h1) blocks.push(`<h1>${inline(h1[1])}</h1>`);
    else if (h2) blocks.push(`<h2>${inline(h2[1])}</h2>`);
    else if (h3) blocks.push(`<h3>${inline(h3[1])}</h3>`);
    else if (li) {
      const inner = isHighlight
        ? `<span style="background-color: #${MMC_HIGHLIGHT_HEX}">${inline(li[1])}</span>`
        : inline(li[1]);
      blocks.push(`<li>${inner}</li>`);
    } else if (oli) {
      const inner = isHighlight
        ? `<span style="background-color: #${MMC_HIGHLIGHT_HEX}">${inline(oli[2])}</span>`
        : inline(oli[2]);
      blocks.push(`<li value="${oli[1]}">${inner}</li>`);
    } else {
      const inner = inline(line);
      const wrapped = isHighlight
        ? `<span style="background-color: #${MMC_HIGHLIGHT_HEX}">${inner}</span>`
        : inner;
      blocks.push(`<p>${wrapped}</p>`);
    }
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.6; color: #111; padding: 0.5in; }
  h1 { font-size: 22pt; margin-top: 1.5em; }
  h2 { font-size: 17pt; margin-top: 1.2em; }
  h3 { font-size: 13pt; margin-top: 1em; }
  p { margin: 0 0 0.8em; }
  li { margin: 0.2em 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
</style></head><body>
${blocks.join("\n")}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SPICY_HIGHLIGHT_HEX_PDF = "f4cccc";

function inlineFormat(s: string): string {
  return s
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /==([^=]+?)==/g,
      `<span style="background-color: #${SPICY_HIGHLIGHT_HEX_PDF}">$1</span>`,
    );
}
