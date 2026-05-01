import { Fragment, useMemo, type ReactNode } from "react";
import { useTranslation, joinPartResults } from "@/store/translation";
import {
  detectMaleLeadName,
  findMmcParagraphLineRanges,
  isLineInRanges,
} from "@/lib/highlight-mmc";
import { CopyPartButton } from "./CopyPartButton";

function renderInlineSpicy(line: string): ReactNode {
  if (line.length === 0) return " ";
  if (!line.includes("==")) return line;
  const parts: ReactNode[] = [];
  const re = /==([^=]+?)==/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(
      <span
        key={key++}
        style={{ backgroundColor: "#f4cccc" }}
        className="rounded-sm px-0.5"
      >
        {m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <Fragment>{parts}</Fragment>;
}

export function ResultViewer() {
  const partResults = useTranslation((s) => s.partResults);
  const jobToPart = useTranslation((s) => s.jobToPart);
  const inProgressCount = useTranslation((s) => s.inProgressCount);

  const result = useMemo(() => joinPartResults(partResults), [partResults]);
  const maleLead = useMemo(() => detectMaleLeadName(result), [result]);
  const lines = useMemo(() => result.split("\n"), [result]);
  const ranges = useMemo(
    () => (maleLead ? findMmcParagraphLineRanges(lines, maleLead) : []),
    [lines, maleLead],
  );

  const partsInResult = useMemo(
    () =>
      Object.keys(partResults)
        .map((k) => parseInt(k, 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b),
    [partResults],
  );
  const partsToShow = partsInResult.length > 0 ? partsInResult : [1, 2];

  const inProgressParts = useMemo(
    () => new Set(Object.values(jobToPart)),
    [jobToPart],
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Tradução (EN-US)
          </span>
          {maleLead && (
            <span className="rounded bg-mmcGreen px-2 py-0.5 text-xs text-emerald-900">
              MMC: <span className="font-semibold capitalize">{maleLead}</span>
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="animate-pulse text-xs text-emerald-700">
              {inProgressCount} parte{inProgressCount === 1 ? "" : "s"} em paralelo...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {partsToShow.map((n) => (
            <div key={n} className="flex items-center gap-1">
              <CopyPartButton partNumber={n} />
              {inProgressParts.has(n) && (
                <span className="text-[10px] text-emerald-600 animate-pulse">
                  ●
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {result.trim().length === 0 ? (
        <div className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-slate-400">
          A tradução aparecerá aqui em streaming.
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
          {lines.map((line, i) => {
            const mmcHighlight = isLineInRanges(i, ranges);
            return (
              <div
                key={i}
                className={mmcHighlight ? "bg-mmcGreen rounded-sm px-1" : undefined}
              >
                {renderInlineSpicy(line)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
