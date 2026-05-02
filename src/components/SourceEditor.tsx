import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { useTranslation } from "@/store/translation";
import type { UseFindBarReturn } from "@/lib/use-find-bar";
import type { MatchRange } from "@/lib/find-utils";
import { cn } from "@/lib/cn";
import { FindBar } from "./FindBar";

interface SourceEditorProps {
  find: UseFindBarReturn;
}

export function SourceEditor({ find }: SourceEditorProps) {
  const source = useTranslation((s) => s.source);
  const setSource = useTranslation((s) => s.setSource);
  const sourceName = useTranslation((s) => s.sourceName);
  const sourceFormat = useTranslation((s) => s.sourceFormat);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    const sbW = ta.offsetWidth - ta.clientWidth;
    ov.style.paddingRight = sbW > 0 ? `calc(1rem + ${sbW}px)` : "";
  });

  useEffect(() => {
    if (find.currentIndex < 0) return;
    const m = find.matches[find.currentIndex];
    const ta = textareaRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov || !m) return;

    const activeBefore = document.activeElement as HTMLElement | null;
    const savedScroll = ta.scrollTop;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(m.start, m.end);
    ta.scrollTop = savedScroll;
    if (
      activeBefore instanceof HTMLInputElement &&
      activeBefore !== (ta as unknown as HTMLElement)
    ) {
      activeBefore.focus();
    }

    const mark = ov.querySelector<HTMLElement>('mark[data-current="true"]');
    if (!mark) return;

    const ovRect = ov.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    const markTopInOv = markRect.top - ovRect.top + ov.scrollTop;
    const target = Math.max(
      0,
      Math.min(
        ov.scrollHeight - ov.clientHeight,
        markTopInOv - (ov.clientHeight - markRect.height) / 2,
      ),
    );

    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const start = ta.scrollTop;
    const delta = target - start;
    if (Math.abs(delta) < 1) {
      ta.scrollTop = target;
      ov.scrollTop = target;
      return;
    }
    const duration = 250;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = start + delta * eased;
      ta.scrollTop = cur;
      ov.scrollTop = cur;
      if (t < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        animationRef.current = null;
      }
    };
    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [find.currentIndex, find.matches]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const ov = overlayRef.current;
    if (ov) ov.scrollTop = e.currentTarget.scrollTop;
  };

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Roteiro original (PT-BR)
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {sourceName ? (
            <>
              <span className="font-mono">{sourceName}</span>
              {sourceFormat && (
                <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 uppercase dark:bg-slate-700 dark:text-slate-200">
                  {sourceFormat}
                </span>
              )}
            </>
          ) : (
            "Importe um arquivo .docx ou .pdf"
          )}
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
        placeholder="Pesquisar no roteiro…"
      />
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={overlayRef}
          aria-hidden
          className="scrollbar-hide pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed text-transparent"
        >
          {renderOverlay(source, find.matches, find.currentIndex, find.isOpen)}
        </div>
        <textarea
          ref={textareaRef}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          placeholder="Conteúdo do roteiro aparecerá aqui após importar. Você pode editar antes de traduzir."
          className="relative h-full w-full resize-none whitespace-pre-wrap break-words bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

function renderOverlay(
  text: string,
  matches: MatchRange[],
  currentIndex: number,
  isOpen: boolean,
): ReactNode {
  if (!isOpen || matches.length === 0) {
    return <>{text}{"\n"}</>;
  }
  const parts: ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    if (m.start > last) parts.push(text.slice(last, m.start));
    const isCurrent = i === currentIndex;
    parts.push(
      <mark
        key={i}
        data-current={isCurrent ? "true" : undefined}
        className={cn(
          "rounded-sm text-transparent",
          isCurrent
            ? "bg-orange-400 ring-2 ring-orange-500 dark:bg-orange-500"
            : "bg-yellow-200 dark:bg-yellow-700",
        )}
      >
        {text.slice(m.start, m.end)}
      </mark>,
    );
    last = m.end;
  });
  if (last < text.length) parts.push(text.slice(last));
  parts.push("\n");
  return <Fragment>{parts}</Fragment>;
}
