export interface MatchRange {
  start: number;
  end: number;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findMatches(
  haystack: string,
  query: string,
  caseSensitive: boolean,
): MatchRange[] {
  if (!query || query.length === 0) return [];
  const re = new RegExp(escapeRegex(query), caseSensitive ? "g" : "gi");
  const out: MatchRange[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(haystack)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}
