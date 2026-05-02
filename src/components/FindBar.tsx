import { useEffect, useRef, type KeyboardEvent } from "react";
import { CaseSensitive, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface FindBarProps {
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  currentIndex: number;
  matchCount: number;
  onQueryChange: (q: string) => void;
  onToggleCaseSensitive: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  placeholder?: string;
  className?: string;
}

export function FindBar({
  isOpen,
  query,
  caseSensitive,
  currentIndex,
  matchCount,
  onQueryChange,
  onToggleCaseSensitive,
  onPrev,
  onNext,
  onClose,
  placeholder = "Pesquisar…",
  className,
}: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const hasQuery = query.trim().length > 0;
  const counter = hasQuery ? `${currentIndex + 1} de ${matchCount}` : "0 de 0";
  const navDisabled = matchCount === 0;

  return (
    <div
      role="search"
      className={cn(
        "flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-3 py-1.5 backdrop-blur",
        "dark:border-slate-800 dark:bg-slate-800/60",
        className,
      )}
    >
      <Search
        aria-hidden
        className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          "h-7 min-w-0 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none",
          "dark:text-slate-200 dark:placeholder:text-slate-500",
        )}
      />
      <span
        className={cn(
          "shrink-0 text-right text-xs tabular-nums",
          matchCount === 0 && hasQuery
            ? "text-rose-500 dark:text-rose-400"
            : "text-slate-500 dark:text-slate-400",
          !hasQuery && "opacity-50",
        )}
      >
        {counter}
      </span>
      <button
        type="button"
        onClick={onToggleCaseSensitive}
        title={caseSensitive ? "Diferenciar maiúsculas/minúsculas: ON" : "Diferenciar maiúsculas/minúsculas: OFF"}
        aria-pressed={caseSensitive}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded transition-colors",
          caseSensitive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
        )}
      >
        <CaseSensitive className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onPrev}
        disabled={navDisabled}
        title="Anterior (Shift+Enter)"
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-slate-500 transition-colors",
          "hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
          "disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent",
        )}
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={navDisabled}
        title="Próximo (Enter)"
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-slate-500 transition-colors",
          "hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
          "disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent",
        )}
      >
        <ChevronDown className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onClose}
        title="Fechar (Esc)"
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-slate-500 transition-colors",
          "hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
