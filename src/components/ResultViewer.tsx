import { useEffect, useMemo, useRef } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation, joinPartResults } from "@/store/translation";
import { detectMaleLeadName } from "@/lib/highlight-mmc";
import { RichRenderer } from "@/lib/markdown-blocks";
import type { UseFindBarReturn } from "@/lib/use-find-bar";
import { CopyPartButton } from "./CopyPartButton";
import { FindBar } from "./FindBar";

interface ResultViewerProps {
  find: UseFindBarReturn;
}

export function ResultViewer({ find }: ResultViewerProps) {
  const partResults = useTranslation((s) => s.partResults);
  const jobToPart = useTranslation((s) => s.jobToPart);
  const inProgressCount = useTranslation((s) => s.inProgressCount);

  const result = useMemo(() => joinPartResults(partResults), [partResults]);
  const maleLead = useMemo(() => detectMaleLeadName(result), [result]);

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

  const isStreaming = inProgressCount > 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (find.currentIndex < 0) return;
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[data-search-match-index="${find.currentIndex}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [find.currentIndex, find.query, find.caseSensitive, result]);

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Tradução (EN-US)
          </span>
          {maleLead && (
            <span className="rounded bg-mmcGreen px-2 py-0.5 text-xs text-emerald-900 dark:bg-mmcGreenDark dark:text-emerald-100">
              MMC: <span className="font-semibold capitalize">{maleLead}</span>
            </span>
          )}
          {isStreaming && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
              {inProgressCount} parte{inProgressCount === 1 ? "" : "s"} em paralelo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {partsToShow.map((n) => (
            <div key={n} className="flex items-center gap-1">
              <CopyPartButton partNumber={n} />
              {inProgressParts.has(n) && (
                <span
                  aria-hidden
                  className="size-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <FindBar
        isOpen={find.isOpen}
        query={find.query}
        caseSensitive={find.caseSensitive}
        currentIndex={find.currentIndex}
        matchCount={find.matchCount}
        onQueryChange={find.setQuery}
        onToggleCaseSensitive={find.toggleCaseSensitive}
        onPrev={find.prev}
        onNext={find.next}
        onClose={find.close}
        placeholder="Pesquisar na tradução…"
      />

      {result.trim().length === 0 ? (
        <EmptyState />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-5">
          <RichRenderer
            markdown={result}
            options={{ showCursor: isStreaming, maleLeadName: maleLead }}
            searchQuery={find.query}
            searchCaseSensitive={find.caseSensitive}
            currentMatchIndex={find.currentIndex}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-full bg-emerald-50 p-3 dark:bg-emerald-950/50">
        <Sparkles className="size-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          A tradução aparecerá aqui
        </p>
        <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
          Ela será exibida com a mesma formatação da entrega final — Arial,
          capítulos em bold, POV do MMC destacado em verde.
        </p>
      </div>
    </div>
  );
}
