/** Mirror de src/lib/highlight-mmc.ts — usado pelo main process (DOCX/PDF export). */

const POV_MARKER_RE = /^\s*(#{0,6})\s*(?:\*{1,3}\s*)?✦\s+(.+?)(?:\s*\*{1,3})?\s*$/;

const SECTION_HEADER_RE =
  /^\s*(?:#{1,3}\s+|\*{2,3}\s*|[\u{1F4D9}\u{1F4D8}\u{1F4D2}]\s*)*(PARTE?|PART|Capítulo|Capitulo|Chapter)\b/iu;

export function detectMaleLeadName(markdown: string): string | null {
  const re = new RegExp(POV_MARKER_RE.source, "gm");
  const byHashCount = new Map<number, Map<string, number>>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const hashCount = m[1].length;
    const name = canonical(m[2]);
    if (!byHashCount.has(hashCount)) byHashCount.set(hashCount, new Map());
    const inner = byHashCount.get(hashCount)!;
    inner.set(name, (inner.get(name) ?? 0) + 1);
  }

  if (byHashCount.size === 0) return null;

  const allNames = new Set<string>();
  for (const inner of byHashCount.values()) {
    for (const name of inner.keys()) allNames.add(name);
  }
  if (allNames.size < 2) return null;

  const hashLevels = [...byHashCount.keys()].sort((a, b) => b - a);
  if (hashLevels.length > 1) {
    const maxGroup = byHashCount.get(hashLevels[0])!;
    const sorted = [...maxGroup.entries()].sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  const onlyGroup = byHashCount.get(hashLevels[0])!;
  if (onlyGroup.size < 2) return null;
  const entries = [...onlyGroup.entries()].sort((a, b) => a[1] - b[1]);
  const [minName, minCount] = entries[0];
  const secondMin = entries[1][1];
  if (minCount < 2) return null;
  if (minCount === secondMin) return null;
  return minName;
}

export function canonical(s: string): string {
  return s.replace(/^✦\s*/, "").trim().toLowerCase();
}

export function isPovHeader(line: string): { isPov: true; name: string } | { isPov: false } {
  const m = line.match(POV_MARKER_RE);
  return m ? { isPov: true, name: m[2] } : { isPov: false };
}

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

export const MMC_HIGHLIGHT_HEX = "d9ead3";
export const INTIMATE_HIGHLIGHT_HEX = "f4cccc";

const INTIMATE_OPEN_RE = /^\s*<<\s*intimate\s*>>\s*$/i;
const INTIMATE_CLOSE_RE = /^\s*<<\s*\/\s*intimate\s*>>\s*$/i;

export function isIntimateOpenMarker(line: string): boolean {
  return INTIMATE_OPEN_RE.test(line);
}

export function isIntimateCloseMarker(line: string): boolean {
  return INTIMATE_CLOSE_RE.test(line);
}

export function isIntimateMarker(line: string): boolean {
  return isIntimateOpenMarker(line) || isIntimateCloseMarker(line);
}

export function findIntimateLineRanges(
  lines: string[],
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let openStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isIntimateOpenMarker(lines[i])) {
      openStart = i + 1;
      continue;
    }
    if (isIntimateCloseMarker(lines[i])) {
      if (openStart >= 0 && i > openStart) {
        ranges.push({ start: openStart, end: i });
      }
      openStart = -1;
    }
  }
  if (openStart >= 0 && openStart < lines.length) {
    ranges.push({ start: openStart, end: lines.length });
  }
  return ranges;
}
