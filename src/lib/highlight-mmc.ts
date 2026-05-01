/** Compartilhado entre renderer e main (electron/format/highlight-mmc.ts é cópia espelho). */

const POV_MARKER_RE = /^\s*(?:#{1,6}\s+)?(?:\*{1,3}\s*)?✦\s+(.+?)(?:\s*\*{1,3})?\s*$/;

export function detectMaleLeadName(markdown: string): string | null {
  const re = new RegExp(POV_MARKER_RE.source, "gm");
  const counts = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const key = canonical(m[1]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size < 2) return null;
  const entries = [...counts.entries()].sort((a, b) => a[1] - b[1]);
  const [minName, minCount] = entries[0];
  const secondMin = entries[1][1];
  if (minCount < 2) return null;
  if (minCount === secondMin) return null;
  return minName;
}

export function canonical(s: string): string {
  return s.replace(/^✦\s*/, "").trim().toLowerCase();
}

/** Returns true se a linha é um cabeçalho de POV (qualquer formato suportado). */
export function isPovHeader(line: string): { isPov: true; name: string } | { isPov: false } {
  const m = line.match(POV_MARKER_RE);
  return m ? { isPov: true, name: m[1] } : { isPov: false };
}

/** Headers de seção/capítulo/parte (que limpam o estado de POV corrente). */
const SECTION_HEADER_RE =
  /^\s*(?:#{1,3}\s+|\*{2,3}\s*|[\u{1F4D9}\u{1F4D8}\u{1F4D2}]\s*)*(PARTE?|PART|Capítulo|Capitulo|Chapter)\b/iu;

export function isSectionHeader(line: string): boolean {
  return SECTION_HEADER_RE.test(line);
}

export function findMmcParagraphLineRanges(
  lines: string[],
  maleLeadName: string,
): Array<{ start: number; end: number }> {
  const target = canonical(maleLeadName);
  const ranges: Array<{ start: number; end: number }> = [];
  let inMmc = false;
  let blockStart = -1;

  const flush = (endExclusive: number) => {
    if (inMmc && blockStart >= 0 && endExclusive > blockStart) {
      ranges.push({ start: blockStart, end: endExclusive });
    }
    blockStart = -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pov = isPovHeader(line);
    if (pov.isPov) {
      flush(i);
      const isMmc = canonical(pov.name) === target;
      inMmc = isMmc;
      blockStart = isMmc ? i + 1 : -1;
      continue;
    }
    if (isSectionHeader(line)) {
      flush(i);
      inMmc = false;
      continue;
    }
  }
  flush(lines.length);
  return ranges;
}

export function isLineInRanges(
  lineIdx: number,
  ranges: Array<{ start: number; end: number }>,
): boolean {
  for (const r of ranges) {
    if (lineIdx >= r.start && lineIdx < r.end) return true;
  }
  return false;
}

export const MMC_HIGHLIGHT_HEX = "#d9ead3";
