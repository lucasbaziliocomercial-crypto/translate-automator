/**
 * Splitter de partes do roteiro.
 * Reconhece cabeçalhos de PARTE em vários formatos:
 *   - "PARTE 1"
 *   - "# PARTE 1" / "## PARTE 1"
 *   - "📙 PARTE 1" / "📘 PARTE 2"
 *   - "**PARTE 1**" (bold)
 *   - "PART 1" (após tradução)
 *
 * O cabeçalho fica incluído no chunk daquela parte (para preservar o título no copy).
 */

const PART_HEADER_RE =
  /^\s*(?:#{1,3}\s+)?(?:\*{1,3}\s*)?(?:[\u{1F4D2}-\u{1F4DF}\p{Co}]\s*)?(PARTE?|PART)\s+(\d+)(?:\s*\*{1,3})?\s*$/iu;

const CHAPTER_HEADER_RE =
  /^\s*(?:#{1,3}\s+)?(?:\*{1,3}\s*)?(CHAPTER|CAP[ÍI]TULO)\s+(\d+)\b.*$/iu;

export interface PartsResult {
  parts: Map<number, string>;
  /** Conteúdo antes da primeira PARTE (raro — geralmente vazio). */
  preamble: string;
}

export function splitByParts(markdown: string): PartsResult {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const parts = new Map<number, string>();
  let currentNum: number | null = null;
  let currentLines: string[] = [];
  const preambleLines: string[] = [];

  const flush = () => {
    if (currentNum !== null) {
      parts.set(currentNum, currentLines.join("\n").trim() + "\n");
    }
  };

  for (const line of lines) {
    const m = line.match(PART_HEADER_RE);
    if (m) {
      flush();
      currentNum = parseInt(m[2], 10);
      currentLines = [line];
    } else if (currentNum === null) {
      preambleLines.push(line);
    } else {
      currentLines.push(line);
    }
  }
  flush();

  if (parts.size === 0) {
    const chapterFallback = splitByChaptersIntoTwo(lines);
    if (chapterFallback) {
      return { parts: chapterFallback, preamble: "" };
    }
  }

  return {
    parts,
    preamble: preambleLines.join("\n").trim(),
  };
}

function splitByChaptersIntoTwo(lines: string[]): Map<number, string> | null {
  const chapterLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (CHAPTER_HEADER_RE.test(lines[i])) chapterLineIndices.push(i);
  }
  if (chapterLineIndices.length < 2) return null;

  const splitIdx = chapterLineIndices[Math.floor(chapterLineIndices.length / 2)];
  const part1 = lines.slice(0, splitIdx).join("\n").trim() + "\n";
  const part2 = lines.slice(splitIdx).join("\n").trim() + "\n";

  return new Map([
    [1, part1],
    [2, part2],
  ]);
}

export function listAvailableParts(markdown: string): number[] {
  return [...splitByParts(markdown).parts.keys()].sort((a, b) => a - b);
}

export function getPart(markdown: string, partNumber: number): string | null {
  const { parts } = splitByParts(markdown);
  return parts.get(partNumber) ?? null;
}
