import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ShadingType,
  type IParagraphOptions,
} from "docx";
import * as fs from "fs";
import {
  detectMaleLeadName,
  findIntimateLineRanges,
  findMmcParagraphLineRanges,
  INTIMATE_HIGHLIGHT_HEX,
  isIntimateMarker,
  isLineInRanges,
  isPovHeader,
  MMC_HIGHLIGHT_HEX,
} from "./highlight-mmc";

/**
 * Serializa o markdown traduzido para .docx com:
 * - Headings (#, ##, ###) → HeadingLevel
 * - **negrito** e *itálico* nos runs
 * - Parágrafos do POV do MMC com fundo verde (shading #d9ead3)
 */
export async function exportMarkdownToDocx(
  markdown: string,
  outputPath: string,
): Promise<void> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const maleLead = detectMaleLeadName(markdown);
  const mmcRanges = maleLead ? findMmcParagraphLineRanges(lines, maleLead) : [];
  const intimateRanges = findIntimateLineRanges(lines);

  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isIntimateMarker(line)) continue;

    const isIntimate = isLineInRanges(i, intimateRanges);
    const isMmc = !isIntimate && isLineInRanges(i, mmcRanges);
    const fillHex = isIntimate
      ? INTIMATE_HIGHLIGHT_HEX
      : isMmc
        ? MMC_HIGHLIGHT_HEX
        : null;

    if (line.trim() === "") {
      paragraphs.push(new Paragraph({}));
      continue;
    }

    const pov = isPovHeader(line);
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/);
    const oli = line.match(/^(\d+)\.\s+(.+)$/);

    if (pov.isPov) {
      paragraphs.push(
        buildParagraph(`✦ ${pov.name}`, { heading: HeadingLevel.HEADING_3 }),
      );
    } else if (h1) {
      paragraphs.push(buildParagraph(h1[1], { heading: HeadingLevel.HEADING_1 }));
    } else if (h2) {
      paragraphs.push(buildParagraph(h2[1], { heading: HeadingLevel.HEADING_2 }));
    } else if (h3) {
      paragraphs.push(buildParagraph(h3[1], { heading: HeadingLevel.HEADING_3 }));
    } else if (li) {
      paragraphs.push(
        buildParagraph(li[1], {
          bullet: { level: 0 },
          fillHex,
        }),
      );
    } else if (oli) {
      paragraphs.push(
        buildParagraph(oli[2], {
          numbering: { reference: "default-numbering", level: 0 },
          fillHex,
        }),
      );
    } else {
      paragraphs.push(buildParagraph(line, { fillHex }));
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buf);
}

interface ParaOpts {
  heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
  bullet?: { level: number };
  numbering?: { reference: string; level: number };
  fillHex?: string | null;
}

function buildParagraph(text: string, opts: ParaOpts): Paragraph {
  const runs = parseInline(text);
  const paraOpts: IParagraphOptions = {
    children: runs,
    ...(opts.heading ? { heading: opts.heading } : {}),
    ...(opts.bullet ? { bullet: opts.bullet } : {}),
    ...(opts.fillHex
      ? {
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: opts.fillHex,
          },
        }
      : {}),
  };
  return new Paragraph(paraOpts);
}

const SPICY_HIGHLIGHT_HEX_DOCX = INTIMATE_HIGHLIGHT_HEX.toUpperCase();

/**
 * Parseia inline markdown: **bold**, *italic*, ***bolditalic***, ==spicy==.
 * O highlight ==...== aplica shading vermelho no run inteiro (também respeita
 * bold/italic interno se houver).
 */
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const re =
    /(==([^=]+?)==|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, m.index) }));
    }
    if (m[2] !== undefined) {
      // ==spicy==
      runs.push(
        new TextRun({
          text: m[2],
          shading: {
            type: ShadingType.CLEAR,
            color: "auto",
            fill: SPICY_HIGHLIGHT_HEX_DOCX,
          },
        }),
      );
    } else if (m[3] !== undefined) {
      runs.push(new TextRun({ text: m[3], bold: true, italics: true }));
    } else if (m[4] !== undefined) {
      runs.push(new TextRun({ text: m[4], bold: true }));
    } else if (m[5] !== undefined) {
      runs.push(new TextRun({ text: m[5], italics: true }));
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }
  if (runs.length === 0) runs.push(new TextRun({ text: "" }));
  return runs;
}
