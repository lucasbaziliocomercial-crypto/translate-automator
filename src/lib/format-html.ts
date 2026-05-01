/**
 * Converte markdown para HTML rico que reproduz a aparência do Google Docs
 * destino — fonte Arial 11pt, headings esquerdos em bold, sem centralização.
 *
 * Estrutura do doc-alvo:
 *   - Cada PARTE é uma aba do Google Docs (a aba já se chama "PARTE N"), então
 *     o cabeçalho de PARTE é OMITIDO ao copiar (skipPartHeader: true por padrão).
 *   - "Capítulo X — Título" vira heading 1 (20pt, bold, esquerda) — estilo Google Docs.
 *   - "✦ NOME" (POV marker) vira heading 2 (14pt, bold, esquerda).
 *   - "________________" vira divisor centralizado.
 *   - "***FIM DA PARTE N***" vira parágrafo italic+bold centralizado.
 *   - Parágrafos do MMC ganham fundo verde #d9ead3.
 *   - Corpo: Arial 11pt, line-height 1.15.
 */

import {
  detectMaleLeadName,
  findMmcParagraphLineRanges,
  isLineInRanges,
  isPovHeader,
  MMC_HIGHLIGHT_HEX,
} from "./highlight-mmc";

const PART_HEADER_RE =
  /^\s*(?:#{1,3}\s+)?(?:\*{1,3}\s*)?(?:[\u{1F4D9}\u{1F4D8}\u{1F4D2}\u{1F4D5}\u{1F4D7}]\s*)?(?:PARTE?|PART)\s+\d+(?:\s*\*{1,3})?\s*$/iu;

const CHAPTER_HEADER_RE =
  /^\s*(?:#{1,3}\s+)?(?:\*{1,3}\s*)?(Capítulo|Capitulo|Chapter)\s+\d+/iu;

const DIVIDER_RE = /^[_\-—–=]{8,}$/;

const END_OF_PART_RE =
  /^\s*\*{2,3}\s*(FIM DA PARTE|END OF PART)\s+\d+\s*\*{2,3}\s*$/iu;

interface FormatOptions {
  /** Aplica destaque verde no POV do MMC (default: true). */
  highlightMmc?: boolean;
  /** Override do nome do MMC; se omitido, é detectado por heurística. */
  maleLeadName?: string | null;
  /**
   * Omite o cabeçalho "PARTE N" do output (default: true para copy).
   * Quando o usuário cola numa aba do Google Docs, a aba já tem o nome da parte —
   * incluir o cabeçalho duplica visualmente.
   */
  skipPartHeader?: boolean;
}

const FONT_STACK = "Arial, sans-serif";
const BODY_SIZE = "11pt";
const BODY_LINE_HEIGHT = "1.15";

export function markdownToRichHtml(
  markdown: string,
  options?: FormatOptions,
): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const highlightMmc = options?.highlightMmc ?? true;
  const skipPartHeader = options?.skipPartHeader ?? true;
  const maleLead =
    options?.maleLeadName !== undefined
      ? options.maleLeadName
      : highlightMmc
        ? detectMaleLeadName(markdown)
        : null;
  const mmcRanges = maleLead ? findMmcParagraphLineRanges(lines, maleLead) : [];

  const blocks: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isHighlight = isLineInRanges(i, mmcRanges);

    if (trimmed === "") {
      continue;
    }

    if (PART_HEADER_RE.test(trimmed)) {
      if (skipPartHeader) continue;
      const cleaned = trimmed.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
      blocks.push(
        `<h1 style="font-family:${FONT_STACK};font-size:26pt;font-weight:bold;margin:0 0 0.6em;text-align:left;color:#000;">${escapeHtml(cleaned)}</h1>`,
      );
      continue;
    }

    if (CHAPTER_HEADER_RE.test(trimmed)) {
      const cleaned = trimmed.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
      blocks.push(
        `<h1 style="font-family:${FONT_STACK};font-size:20pt;font-weight:bold;margin:1em 0 0.4em;text-align:left;color:#000;">${escapeHtml(cleaned)}</h1>`,
      );
      continue;
    }

    const pov = isPovHeader(trimmed);
    if (pov.isPov) {
      blocks.push(
        `<h2 style="font-family:${FONT_STACK};font-size:14pt;font-weight:bold;margin:1em 0 0.3em;text-align:left;color:#000;">✦ ${escapeHtml(pov.name)}</h2>`,
      );
      continue;
    }

    if (DIVIDER_RE.test(trimmed)) {
      blocks.push(
        `<p style="font-family:${FONT_STACK};text-align:center;margin:1em 0;color:#666;letter-spacing:0.15em;">________________</p>`,
      );
      continue;
    }

    if (END_OF_PART_RE.test(trimmed)) {
      const cleaned = trimmed.replace(/\*+/g, "").trim();
      blocks.push(
        `<p style="font-family:${FONT_STACK};font-size:${BODY_SIZE};font-style:italic;font-weight:bold;text-align:center;margin:1.5em 0;color:#000;">${escapeHtml(cleaned)}</p>`,
      );
      continue;
    }

    const h1 = trimmed.match(/^#\s+(.+)$/);
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const li = trimmed.match(/^[-*]\s+(.+)$/);

    const paraStyle = `font-family:${FONT_STACK};font-size:${BODY_SIZE};line-height:${BODY_LINE_HEIGHT};margin:0 0 0.6em;text-align:left;color:#000;`;

    if (h1) {
      blocks.push(
        `<h1 style="font-family:${FONT_STACK};font-size:20pt;font-weight:bold;margin:1em 0 0.4em;text-align:left;color:#000;">${inlineFormat(h1[1])}</h1>`,
      );
    } else if (h2) {
      blocks.push(
        `<h2 style="font-family:${FONT_STACK};font-size:16pt;font-weight:bold;margin:1em 0 0.3em;text-align:left;color:#000;">${inlineFormat(h2[1])}</h2>`,
      );
    } else if (h3) {
      blocks.push(
        `<h3 style="font-family:${FONT_STACK};font-size:14pt;font-weight:bold;margin:1em 0 0.3em;text-align:left;color:#000;">${inlineFormat(h3[1])}</h3>`,
      );
    } else if (li) {
      const inner = inlineFormat(li[1]);
      const wrapped = isHighlight
        ? `<span style="background-color:${MMC_HIGHLIGHT_HEX};">${inner}</span>`
        : inner;
      blocks.push(`<li style="${paraStyle}">${wrapped}</li>`);
    } else {
      const inner = inlineFormat(line);
      const wrapped = isHighlight
        ? `<span style="background-color:${MMC_HIGHLIGHT_HEX};">${inner}</span>`
        : inner;
      blocks.push(`<p style="${paraStyle}">${wrapped}</p>`);
    }
  }

  return wrapDocument(blocks.join("\n"));
}

function wrapDocument(body: string): string {
  return `<meta charset="utf-8"><div style="font-family:${FONT_STACK};font-size:${BODY_SIZE};line-height:${BODY_LINE_HEIGHT};color:#000;">
${body}
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SPICY_HIGHLIGHT_HEX = "#f4cccc";

function inlineFormat(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /==([^=]+?)==/g,
      `<span style="background-color:${SPICY_HIGHLIGHT_HEX};">$1</span>`,
    );
}

/** Plain-text fallback (sem HTML) com cabeçalho de PARTE também removido. */
export function markdownToPlainText(markdown: string, opts?: { skipPartHeader?: boolean }): string {
  const skipPart = opts?.skipPartHeader ?? true;
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (skipPart && PART_HEADER_RE.test(line.trim())) continue;
    out.push(
      line
        .replace(/==([^=]+?)==/g, "$1")
        .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/^#{1,6}\s+/, ""),
    );
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
