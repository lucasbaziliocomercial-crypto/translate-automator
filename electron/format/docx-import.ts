import * as fs from "fs";
import mammoth from "mammoth";
import TurndownService from "turndown";
import JSZip from "jszip";
import log from "electron-log/main";

/**
 * Lê um .docx e converte para markdown estruturado preservando:
 *   - Headings (H1/H2/H3) via mammoth → turndown
 *   - **negrito** e *itálico*
 *   - Listas
 *   - **DESTAQUE VERMELHO** de fundo (cenas íntimas/picantes) — mammoth não
 *     expõe shading de fundo na sua API pública, então fazemos uma segunda
 *     passagem direto no XML do .docx (que é um zip) procurando runs/parágrafos
 *     com w:highlight=red ou w:shd com fill avermelhado, e envelopamos esse
 *     texto com `==texto==` (extensão markdown comum para highlight).
 */
export async function importDocxToMarkdown(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  const flags = await extractParagraphHighlightFlags(buffer);
  const result = await mammoth.convertToHtml({ buffer });
  const annotated = annotateHighlightedBlocks(result.value, flags);

  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });
  td.addRule("preserveBreaks", {
    filter: ["br"],
    replacement: () => "\n",
  });
  td.addRule("spicyHighlight", {
    filter: "mark",
    replacement: (content) => `==${content.trim()}==`,
  });

  const md = td.turndown(annotated);
  return normalize(md);
}

/**
 * Walk no XML cru do DOCX (word/document.xml) para descobrir, parágrafo por
 * parágrafo (ignorando os vazios pra alinhar com a saída do mammoth), se
 * algum run tem destaque vermelho.
 */
async function extractParagraphHighlightFlags(buffer: Buffer): Promise<boolean[]> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) return [];
    const xml = await docFile.async("string");

    const flags: boolean[] = [];
    const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let m: RegExpExecArray | null;
    while ((m = paraRe.exec(xml)) !== null) {
      const para = m[1];
      const text = extractRunText(para);
      if (text.trim().length === 0) continue;
      flags.push(isRedHighlighted(para));
    }
    return flags;
  } catch (e) {
    log.error("[docx-import] falha ao extrair highlights:", e);
    return [];
  }
}

function extractRunText(paragraphXml: string): string {
  const matches = [...paragraphXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches.map((m) => m[1]).join("");
}

function isRedHighlighted(paragraphXml: string): boolean {
  // Cores nomeadas do Word: red, darkRed, magenta, etc.
  if (/<w:highlight\s+w:val="(red|darkRed|magenta|pink)"/i.test(paragraphXml)) {
    return true;
  }
  // Sombreamento custom (Google Docs / cores RGB exatas tipo F4CCCC, FFC7CE, FF9999).
  const shdMatches = [
    ...paragraphXml.matchAll(/<w:(?:shd|highlight)[^>]*w:fill="([0-9A-Fa-f]{6})"/g),
  ];
  if (shdMatches.some((sm) => isRedishHex(sm[1]))) return true;

  // Cor inline em runs: <w:rPr> contendo <w:shd w:fill="..."/>
  const rprShdMatches = [
    ...paragraphXml.matchAll(/<w:rPr>[\s\S]*?<w:shd[^>]*w:fill="([0-9A-Fa-f]{6})"/g),
  ];
  return rprShdMatches.some((sm) => isRedishHex(sm[1]));
}

function isRedishHex(hex: string): boolean {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Vermelho domina (R bem maior que G e B) e é claro o suficiente pra ser highlight.
  return r > g + 20 && r > b + 20 && r >= 180;
}

/**
 * Walk no HTML produzido por mammoth, fechando cada <p>/<h*> com o flag
 * correspondente. Quando o flag é true, envelopa o conteúdo com <mark>
 * (que turndown vai converter pra ==texto==).
 */
function annotateHighlightedBlocks(html: string, flags: boolean[]): string {
  let i = 0;
  return html.replace(
    /<(p|h[1-6])([^>]*)>([\s\S]*?)<\/\1>/g,
    (full, tag, attrs, content) => {
      const flag = flags[i++];
      if (!flag) return full;
      const inner = String(content).trim();
      if (inner.length === 0) return full;
      return `<${tag}${attrs}><mark>${inner}</mark></${tag}>`;
    },
  );
}

function normalize(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/\\\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}
